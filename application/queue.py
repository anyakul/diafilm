#!/usr/bin/env python
import asyncio
import functools
import os
import time
from concurrent.futures import ProcessPoolExecutor

import django
from aiohttp import ClientSession
from arq import create_pool, cron
from arq.connections import RedisSettings
from arq.constants import default_queue_name
from asgiref.sync import sync_to_async
from django.conf import settings
from django.utils import timezone
from pydantic import RedisDsn

# from etl.diafilm import Diafilm
from etl.diafilm import ApiDiafilm

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'application.settings.base')
django.setup()


def get_redis_settings_from_dns(dsn: RedisDsn) -> RedisSettings:
    return RedisSettings(
        host=dsn.host,
        port=int(dsn.port),
        database=int(dsn.path.strip('/')),
        password=dsn.password,
    )


async def download_content(ctx, url):
    session: ClientSession = ctx['session']
    async with session.get(url) as response:
        content = await response.text()
        print(f'{url}: {content:.80}...')

    return len(content)


async def long_job(ctx, timeout: int = 10) -> str:
    await asyncio.sleep(10)
    return f"I'm out of {timeout} seconds of sleep"


async def run_every_minute(ctx):
    print(f"now is {timezone.now().isoformat()}")


def sync_task(timeout: int) -> str:
    time.sleep(timeout)
    return f"Some result after {timeout} seconds of hard working"


async def potentially_blocking(ctx, timeout: int = 10):
    blocking = functools.partial(sync_task, timeout)
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(ctx['pool'], blocking)


async def startup(ctx):
    ctx['session'] = ClientSession()
    # ctx['pool'] = ProcessPoolExecutor()


async def shutdown(ctx):
    await ctx['session'].close()


async def get_diafilm(session, url, handle_id):
    async with session.get(url) as response:
        data = await response.json()
        return handle_id, data


async def fetch_handle_data(ctx, id_list):
    session: ClientSession = ctx['session']
    url_tmpl = "https://arch.rgdb.ru/rest/items/{}/metadata"

    tasks = []
    for handle_id in id_list:
        url = url_tmpl.format(handle_id)
        tasks.append(asyncio.ensure_future(get_diafilm(session, url, handle_id)))

    from core.models import Diafilm
    obj_list = []
    data_list = await asyncio.gather(*tasks)
    for handle_id, data in data_list:
        diafilm = ApiDiafilm.from_json(index="diafilms", id=handle_id, data=data)
        diafilm = Diafilm.from_api(diafilm)
        obj_list.append(diafilm)

    # loop = asyncio.get_running_loop()
    # await loop.run_in_executor(
    #     ctx['pool'],
    #     Diafilm.objects.bulk_create(obj_list),
    # )

    func = sync_to_async(Diafilm.objects.bulk_create)
    await func(obj_list)

    return True


class WorkerSettings:
    redis_settings = settings.ARQ_QUEUES[default_queue_name]
    functions = [download_content, long_job, fetch_handle_data]
    cron_jobs = [
        cron(run_every_minute, second=30)
    ]
    on_startup = startup
    on_shutdown = shutdown


if __name__ == '__main__':
    print(f"Run worker as 'arq {__file__}.WorkerSettings -v'")

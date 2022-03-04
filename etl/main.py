import asyncio
import logging
import os
import sys
import time
import traceback

import django
import psycopg

from application.settings.base import (ELASTICSEARCH_INDEX,
                                       ELASTICSEARCH_SETTINGS,
                                       ELASTICSEARCH_TIMEOUT, RGDB_DSN)
from etl.diafilm import ApiDiafilm, Diafilm

# from elasticsearch import AsyncElasticsearch
# from elasticsearch._async.client.indices import IndicesClient
# from elasticsearch.helpers import async_bulk


os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'application.settings.dev',
)
django.setup()

logger = logging.getLogger(__name__)


# es = AsyncElasticsearch()

START_ID = 45803
ROW_QUERY = (
    "SELECT i.item_id, mdfr.element, mdfr.qualifier, mdv.text_value "
    "FROM rgdb.item i "
    "INNER JOIN rgdb.handle h ON h.resource_id = i.item_id "
    "INNER JOIN rgdb.metadatavalue mdv ON mdv.resource_id = h.resource_id "
    "INNER JOIN rgdb.metadatafieldregistry mdfr ON mdv.metadata_field_id = mdfr.metadata_field_id "
    f"WHERE i.owning_collection = 15 AND i.item_id >= {START_ID}"  # AND i.item_id IN (43056, 43068, 43052)
    "ORDER BY mdv.resource_id, mdfr.metadata_field_id, mdv.text_value"
)

ROW_FIELDS = (
    "item_id", "element",
    "qualifier", "text_value",
)


def gendata(return_type="obj"):
    with psycopg.Connection.connect(RGDB_DSN) as conn:
        with conn.cursor() as cursor:
            result = cursor.execute(ROW_QUERY)

            obj = None
            added = 0
            while True:
                qs = result.fetchmany(50)
                if not qs:
                    break

                for row in qs:
                    row = {k: v for k, v in zip(ROW_FIELDS, row)}

                    if obj is not None and obj.id != row["item_id"]:
                        # debug print
                        # item.data.pop("raw")
                        # print(json.dumps(item.data, indent=2, ensure_ascii=False, default=str))
                        yield obj.data if return_type == "doc" else obj
                        added += 1
                        # debug return
                        # if added == 3:
                        #     return
                        obj = None

                    if obj is None:
                        obj = Diafilm(
                            doc_id=row["item_id"],
                        )

                    obj.set(row)


async def agendata(return_type="obj"):
    """
    Выбирает записи из дампа по запросу ROW_QUERY
    Итерируется по записям для одного объекта
    При смене объекта отдаёт собранный в вызывающую функцию
    """
    async with await psycopg.AsyncConnection.connect(RGDB_DSN) as aconn:
        async with aconn.cursor() as cursor:
            result = await cursor.execute(ROW_QUERY)

            obj = None
            added = 0
            while True:
                qs = await result.fetchmany(50)
                if not qs:
                    break

                for row in qs:
                    row = {k: v for k, v in zip(ROW_FIELDS, row)}

                    if obj is not None and obj.id != row["item_id"]:
                        # debug print
                        # item.data.pop("raw")
                        # print(json.dumps(item.data, indent=2, ensure_ascii=False, default=str))
                        yield obj.data if return_type == "doc" else obj
                        added += 1
                        # debug return
                        # if added == 3:
                        #     return
                        obj = None

                    if obj is None:
                        obj = Diafilm(
                            doc_id=row["item_id"],
                        )

                    obj.set(row)


async def cleanup():
    client = IndicesClient(es)
    if await client.exists(index=ELASTICSEARCH_INDEX):
        await client.delete(index=ELASTICSEARCH_INDEX)
        logger.info("Index deleted")

    # await client.transport.close(index=ELASTICSEARCH_INDEX)


async def init():
    client = IndicesClient(es)
    if not await client.exists(index=ELASTICSEARCH_INDEX):
        await client.create(index=ELASTICSEARCH_INDEX, body=ELASTICSEARCH_SETTINGS)
        logger.info("Index created")


async def pg2es():
    # await client.transport.close(index=INDEX_NAME)
    await async_bulk(es, gendata(), timeout=ELASTICSEARCH_TIMEOUT)


async def apg2pg():
    from core.models import Diafilm

    i = 0
    async for obj in gendata():
        # obj = Diafilm.from_json()
        data = Diafilm.from_api(obj)
        obj = Diafilm(**data)
        try:
            obj.handle_related_page()
            # obj.save()
        except Exception as exc:
            traceback.print_exc()
            print(exc)

        i += 1
        print(obj)

    print(i)


def pg2pg():
    import requests

    from core.models import Diafilm as d_model

    i = 0
    for d_raw in gendata():
        # request api
        url = f"https://arch.rgdb.ru/rest/items/{d_raw.id}/metadata"

        data = None
        retry = 0
        while data is None and retry < 3:
            try:
                response = requests.get(url, timeout=5)
                data = response.json() if response.ok else False
            except Exception as exc:
                logger.error(
                    "Diafilm data download failed: %s (%s)",
                    exc, url,
                    exc_info=True,
                )

                retry += 1
                time.sleep(30 * retry)

        # update data
        if data:
            d_raw = ApiDiafilm.from_json(d_raw.id, data, obj=d_raw)

        data = d_model.from_api(d_raw)
        d_obj = d_model.objects.filter(eid=data["eid"]).first()
        if not d_obj:
            d_obj = d_model(**data)
        else:
            for k, v in data.items():
                setattr(d_obj, k, v)

            d_obj.save()

        try:
            d_obj.save()
        except Exception as exc:
            logger.error(
                "Diafilm save failed: %s (%s)",
                exc, data,
                exc_info=True,
            )
            continue

        try:
            d_obj.handle_related_persons()
            d_obj.handle_related_locations()
            d_obj.handle_related_page()
            d_obj.elasticsearch_sync()
        except Exception as exc:
            logger.error(
                "Diafilm handle failed: %s (%s)",
                exc, d_obj,
                exc_info=True,
            )

        i += 1
        print(d_obj)

    print(i)


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    if len(sys.argv) > 1 and sys.argv[1] == "pg2es":
        loop.run_until_complete(cleanup())
        loop.run_until_complete(init())
        # loop.run_until_complete(pg2es())
        loop.run_until_complete(es.transport.close())
    else:
        # loop.run_until_complete(apg2pg())
        pg2pg()

    logger.info("Completed")

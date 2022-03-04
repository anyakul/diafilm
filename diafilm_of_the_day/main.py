import os
import socket
from datetime import datetime
from urllib.request import urlretrieve

import psycopg2
from psycopg2.extras import DictCursor

dsl = {
    'dbname': 'diafilms',
    'user': 'postgres',
    'password': 'psswd',
    'host': '127.0.0.1',
    'port': 5432,
}


def main(data):
    query = """
        SELECT h.handle_id, h.handle, mdv.text_value filename
        FROM handle h
        INNER JOIN item i ON i.item_id = h.resource_id
        INNER JOIN item2bundle i2b ON i2b.item_id = h.resource_id
        INNER JOIN bundle2bitstream b2b ON i2b.bundle_id = b2b.bundle_id AND b2b.bitstream_order = 0
        INNER JOIN bitstream b ON b.bitstream_id = b2b.bitstream_id
        INNER JOIN metadatavalue mdv ON mdv.resource_id = b2b.bitstream_id AND mdv.resource_type_id = 0 AND mdv.metadata_field_id = 64
        GROUP BY h.handle_id, h.handle
        WHERE h.handle IN %s
              AND b.sequence_id = 1
        --LIMIT 3
        ;
    """

    query = """
        SELECT h.handle_id, h.handle, mdv.text_value filename
        FROM handle h
        INNER JOIN item2bundle i2b
                   ON i2b.item_id = h.resource_id
        INNER JOIN bundle2bitstream b2b
                   ON b2b.bundle_id = i2b.bundle_id
                   AND b2b.bitstream_order = 0
        INNER JOIN bitstream b
                   ON b.bitstream_id = b2b.bitstream_id
        INNER JOIN metadatavalue mdv
                   ON mdv.resource_id = b2b.bitstream_id
                   AND mdv.resource_type_id = 0
                   AND mdv.metadata_field_id = 64
        WHERE handle IN %s
    ;
    """
    """
    
    db2.csv dups
    [
        ('123456789/37468', datetime.datetime(2021, 8, 9, 0, 0)), 
        ('123456789/37930', datetime.datetime(2021, 8, 26, 0, 0)), 
        ('123456789/39762', datetime.datetime(2021, 12, 28, 0, 0)),
    ]

    """
    with psycopg2.connect(**dsl, cursor_factory=DictCursor) as pg_conn:
        socket.setdefaulttimeout(2)
        cursor = pg_conn.cursor()

        # handles, dates = zip(*data)
        handles = dict(data)
        cursor.execute(query, vars=(tuple(handles.keys()), ))
        processed = set()
        for row in cursor:
            url = f"https://arch.rgdb.ru/xmlui/bitstream/handle/{row['handle']}/{row['filename']}"

            if row['handle_id'] in processed:
                print('Already processed, skip')
                continue

            processed.add(row['handle_id'])
            dt = handles.pop(row['handle'])
            filename = f"{dt.strftime('%m_%d')}_{row['handle_id']}.jpg"
            path = os.path.join("media", filename)
            if os.path.isfile(path):
                print('Already downloaded, skip')
                continue

            try:
                urlretrieve(url, path)
                print(url, path)
            except Exception as exc:
                print(url, exc)

        for x in handles:
            print("Not found", x)

        print("Total", len(data))
        print("Processed", len(processed))



if __name__ == "__main__":
    with open('db2.csv', 'r') as fp:
        data = [x.strip().split(";") for x in fp]
        data = [(h, datetime(datetime.now().year, int(d[:2]), int(d[2:]))) for h, d in data]

    main(data)

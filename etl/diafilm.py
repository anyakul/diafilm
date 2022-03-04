import json
import logging
import re
from datetime import datetime
from pathlib import Path

from dateutil.parser import ParserError
from dateutil.parser import parse as parse_date
from django.conf import settings

logger = logging.getLogger(__name__)


class Diafilm:
    data = {}
    ignore = (
        ("contributor", "added_by"),
    )

    def __init__(self, doc_id):
        self.id = doc_id
        self.raw = []
        self.data = {
            "title": None,
            "color": True,
            "picturetype": "Не указано",
            "language": "ru",
            "locations": [],
            "handle": "",
            "categories": [],
            # количество диафильмов / кадров
            "pages": [],
            "persons": [],
            "dates": {},
            "labels": {},
            "publisher": None,
            "rights": None,
            "description": [],
            "diafilm_of_the_day": None,
        }

        self.process_diafilm_of_the_day()

    def __str__(self):
        return f"Diafilm {self.id} «{self.data['title']}»"

    def __getattr__(self, item):
        return self.data[item]

    @property
    def handle(self):
        return "/".join(self.data["handle"])

    @property
    def handle_id(self):
        return self.data["handle"][1]

    def set(self, row):
        """
        [36365, "contributor", "author", "Киплинг Редьярд"],
        [36365, "contributor", "illustrator", "Сутеев Владимир Григорьевич"],
        [36365, "date", "accessioned", "2016-01-27T11:47:16Z"],
        [36365, "date", "available", "2016-01-27T11:47:16Z"],
        [36365, "date", "copyright", "8888"],
        [36365, "date", "issued", "1965"],
        [36365, "identifier", null, "RU/RGDB/BIBL/0000380748"],
        [36365, "identifier", "uri", "http://arch.rgdb.ru/xmlui/handle/123456789/36371"],
        [36365, "description", "provenance", "Made available in DSpace on ..."],
        [36365, "publisher", null, "Москва : Диафильм"],
        [36365, "rights", null, "Защищено авторским правом"],
        [36365, "title", null, "THUMBNAIL"],
        [36365, "title", null, "Слоненок"],
        [36365, "type", null, "Сказки"],
        [36365, "pagination", null, "1 дф. (47 кд.)"],
        [36365, "dictionary", "responsibility", "Киплинг Р.; Худож. Сутеев В."],
        [36365, "dictionary", "publisher", "Диафильм"],
        [36365, "dictionary", "creator", "РГДБ"],
        [36365, "target", null, "для детей младшего возраста, 5-10 лет"],
        [36365, "date", "loaded", "2016.01.26"],
        [36365, "firstname", null, "Татьяна"],
        [36365, "lastname", null, "Родникова"],
        [36365, "phone", null, "89250985928"],
        [36365, "language", null, "ru"]

        :param row:
        :return:
        """
        row.pop("item_id", None)
        result = json.dumps(
            list(row.values()),
            ensure_ascii=False, default=str,
        )
        self.raw.append(result)
        if (row["element"], row["text_value"]) in self.ignore:
            return

        # print(row)
        separators = [",", ";"]
        values = []

        i = 0
        while len(values) < 2 and len(separators) > i:
            s = separators[i]
            values = (row["text_value"] or "").split(s)
            i += 1

        values = map(lambda x: x.strip(), values)
        method_name = f"handle_{row['element']}"
        method = getattr(self, method_name, None)
        if callable(method):
            method(row, values)

    def handle_contributor(self, row, values):
        roles = {
            "illustrator": "иллюстратор",
            "author": "автор",
            "added_by": "обработчик",
            "other": "другое",
        }
        name, role = row["text_value"], row["qualifier"]
        if row["qualifier"] == "other" and "," in row["text_value"]:
            name, role = [x.strip() for x in row["text_value"].split(",")]

        result = {
            "role": roles.get(role, role).lower(),
            "name": name,
        }

        if result not in self.data["persons"]:
            self.data["persons"].append(result)

    def handle_date(self, row, values):
        for x in values:
            if isinstance(x, datetime):
                result = x
            else:
                x = re.sub(r"[^\d.\-TZ\: ]", "", x)

                try:
                    result = parse_date(x, default=datetime(2021, 1, 1))
                except ParserError as exc:
                    logger.error("Parse error: %s (%s)", exc, row)
                    result = None

            key = row["qualifier"]
            self.data["dates"][key] = (
                result.isoformat()
                if result else
                row["text_value"]
            )

    def handle_description(self, row, values):
        cover = self.data.get("cover")
        if row["qualifier"] == "provenance" and not cover:
            cover = re.search(
                r"^([^:]+): \d+ bytes, checksum: [^ ]+ \(MD5\)",
                row["text_value"],
                re.MULTILINE,
            )
            # https://arch.rgdb.ru/xmlui/bitstream/handle/123456789/43056/Image00003.jpg
            # https://arch.rgdb.ru/xmlui/bitstream/handle/123456789/27102/Untitled03.jpg
            if cover:
                self.data["cover"] = (
                    "https://arch.rgdb.ru/xmlui/bitstream/handle"
                    f"/{self.handle}/{cover.groups()[0]}"
                )

        result = {
            "type": row["qualifier"],
            "value": row["text_value"],
        }

        self.data["description"].append(result)

    def handle_dictionary(self, row, values):
        key = row["qualifier"]
        value = row["text_value"]

        if key == "responsibility":
            return
        elif key == "color":
            value = value == "Цветной"
        elif key == "geoplace":
            key = "locations"
            value = self.data[key] + [value]
        elif key == "dfday":
            key = "diafilm_of_the_day"
            value = [int(x) for x in (value[:2], value[2:])]

        self.data[key] = value

    def handle_identifier(self, row, values):
        if row["qualifier"] == "uri":
            result = row["text_value"].rsplit("/", 2)[-2:]
            self.data["handle"] = result

        result = row["text_value"]
        self.data["labels"][row["qualifier"] or "id"] = result

    def handle_firstname(self, row, values):
        return
        result = row["text_value"]
        self.firstname = result

    def handle_lastname(self, row, values):
        return
        row["qualifier"] = "added_by"
        row["text_value"] = " ".join([getattr(self, "firstname", ''), row["text_value"]])
        self.handle_contributor(row, [])

    def handle_phone(self, row, values):
        pass

    def handle_language(self, row, values):
        result = row["text_value"]
        self.data["language"] = result

    def handle_publisher(self,  row, values):
        result = row["text_value"]
        self.data["publisher"] = result

    def handle_pagination(self, row, values):
        result = re.findall(r"\d{2,}", row["text_value"])
        # print("Set pages", result)
        self.data["pages"] = [int(x) for x in result]

    def handle_rights(self, row, values):
        result = "Защищено авторским правом" in row["text_value"]
        self.data["rights"] = result

    def handle_target(self, row, values):
        result = row["text_value"].capitalize()
        if result not in self.data["categories"]:
            self.data["categories"].append(result)

    def handle_title(self, row, values):
        result = row["text_value"]

        ignore_list = ["ORIGINAL", "THUMBNAIL", "lite200"]
        for x in ignore_list:
            if x in result:
                return

        self.data["title"] = result

    def handle_type(self, row, values):
        # result = row["text_value"].split("--")[0]
        result = row["text_value"]
        if result not in self.data["categories"]:
            self.data["categories"].append(result.strip())

    def handle_series(self, row, values):
        self.data["series"] = row["text_value"]

    def process_diafilm_of_the_day(self):
        # diafilm of the day
        if self.data["diafilm_of_the_day"]:
            return

        dddb = get_dd()
        dd = dddb.get(self.id)
        if dd:
            month, day = [int(x) for x in [dd[:2], dd[2:]]]
            now = datetime.now()
            cy, ny = datetime(now.year, month, day), datetime(now.year + 1, month, day)
            result = cy if cy > now else ny
            self.handle_date({"qualifier": "diafilm_of_the_day"}, [result])
            self.data["diafilm_of_the_day"] = [month, day]


class ApiDiafilm(Diafilm):
    @classmethod
    def from_source(cls, doc_id, data) -> Diafilm:
        obj = cls(doc_id)
        for item in data.splitlines():
            row = json.loads(item)
            obj.set({
                "element": row[0],
                "qualifier": row[1],
                "text_value": row[2],
            })

        return obj

    @classmethod
    def from_json(cls, doc_id, data, obj=None) -> Diafilm:
        """
        [
            {'key': 'dc.contributor.author', 'value': 'Киплинг Редьярд'},
            {'key': 'dc.contributor.illustrator', 'value': 'Сутеев Владимир Григорьевич'},
            {'key': 'dc.date.accessioned', 'value': '2016-01-27T11:47:16Z'},
            {'key': 'dc.date.available', 'value': '2016-01-27T11:47:16Z'},
            {'key': 'dc.date.copyright', 'value': '8888'},
            {'key': 'dc.date.issued', 'value': '1965'},
            {'key': 'dc.identifier', 'value': 'RU/RGDB/BIBL/0000380748'},
            {'key': 'dc.identifier.isbn', 'value': 'Д-180-65'},
            {'key': 'dc.identifier.uri', 'value': 'http://arch.rgdb.ru/xmlui/handle/123456789/36371'},
            {'key': 'dc.publisher', 'value': 'Москва : Диафильм'},
            {'key': 'dc.rights', 'value': 'Защищено авторским правом'},
            {'key': 'dc.title', 'value': 'Слоненок'},
            {'key': 'dc.type', 'value': 'Сказки'},
            {'key': 'dc.pagination', 'value': '1 дф. (47 кд.)'},
            {'key': 'dc.dictionary.responsibility', 'value': 'Киплинг Р.; Худож. Сутеев В.'},
            {'key': 'dc.dictionary.publisher', 'value': 'Диафильм'},
            {'key': 'dc.dictionary.creator', 'value': 'РГДБ'},
            {'key': 'dc.target', 'value': 'для детей младшего возраста, 5-10 лет'},
            {'key': 'dc.date.loaded', 'value': '2016.01.26'},
            {'key': 'dc.dictionary.color', 'value': 'Цветной'},
            {'key': 'dc.dictionary.picturetype', 'value': 'Рисованный'}
        ]
        :params id:
        :param data:
        :return:
        """
        obj = obj or cls(doc_id)
        for item in data:
            # from save
            if isinstance(item, str):
                a = 1
                continue
            row = item["key"].split(".")[1:]
            if len(row) == 1:
                row.append(None)

            obj.set({
                "element": row[0],
                "qualifier": row[1],
                "text_value": item["value"],
            })

        return obj


def get_dd():
    result = get_dd.db
    if result is None:
        path = Path(settings.BASE_DIR, "diafilm_of_the_day", "db.csv")
        try:
            with open(path) as fp:
                result = get_dd.db = {
                    int(k.split("/")[1]): v.strip()
                    for k, v in [x.split(";") for x in fp]
                }
        except Exception as exc:
            logger.warning("Diafilm of the day not available: %s", exc, exc_info=True)
            result = {}

    return result


get_dd.db = None

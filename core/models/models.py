"""

Мы будем хранить людей, диафильмы и связи между ними

Люди только у нас
Диафильмы из РГДБ
И связи между ними оттуда

Нам нужно будет искать и показывать диафильмы
Каждый диафильм будет иметь свою страницу
Отдельные люди будут иметь свои страницы

Ещё будут коллекции - объединение диафильмов
Это будут только страницы

Может получится сделать raw_id_fields choices
ну или придётся использовать snippetchooserpanel

"""
import logging
import uuid
from datetime import datetime

from django.apps import apps
from django.conf import settings
from django.db import models
from django.db.models import Count
from django.forms import Select
from django.utils import timezone
from django.utils.functional import cached_property
from django.utils.text import slugify
from elasticsearch import Elasticsearch
from instance_selector.edit_handlers import InstanceSelectorPanel
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from treenode.models import TreeNodeModel
from wagtail.admin.edit_handlers import (FieldPanel, InlinePanel,
                                         MultiFieldPanel, PageChooserPanel)
from wagtail.core.models import Orderable, Page
from wagtail.snippets.models import register_snippet

from core.blocks import (ColumnsStreamBlock, ColumnStreamBlock,
                         GalleryStreamBlock)
from core.panels import CodePanel, JSONPanel, ReadOnlyPanel
from tools.helpers import block, make_slug, stream

logger = logging.getLogger(__name__)

XMLUI_URL = getattr(settings, "DIAFILMS_XMLUI_URL", "https://arch.rgdb.ru/xmlui/handle")
BASE_HANDLE = getattr(settings, "DIAFILMS_HANDLE", "123456789")


class TreeSelect(Select):
    def optgroups(self, name, value, attrs=None):
        self.choices = [(None, "")] + [
            (x.pk, x.get_display(indent=True))
            for x in self.choices.queryset
        ]
        return super().optgroups(name, value, attrs=None)


class Location(TreeNodeModel, ClusterableModel, models.Model):
    """
    Надеюсь это есть в данных диафильмов в РГДБ
    Мы просто накидаем их сюда из диафильмов
    И будет интерфейс чтобы на картинке задать координаты точки

    Дальше любой объект системы может быть связан с этими локациями
    """
    title = models.CharField(
        verbose_name="Регион/Страна/Город", max_length=255,
        db_index=True,
    )
    aliases = models.TextField(
        verbose_name="Псевдонимы",
        null=True, blank=True,
        help_text="Слова, по которым это также можно найти",
    )
    count = models.IntegerField(
        verbose_name="Диафильмов",
        default=0,
    )
    coordinates = models.CharField(
        verbose_name="Координаты", max_length=255,
        blank=True,
        help_text="Для отображения на карте",
    )

    treenode_display_field = 'title'

    panels = [
        FieldPanel("tn_parent", widget=TreeSelect()),
        FieldPanel("title"),
        # FieldPanel("aliases"),
        FieldPanel("coordinates"),
        InlinePanel(
            "diafilms", label="Диафильмы",
            panels=[
                InstanceSelectorPanel("diafilm"),
            ],
        ),
    ]

    class Meta(TreeNodeModel.Meta):
        verbose_name = "Место"
        verbose_name_plural = "Места"
        ordering = ("tn_order", "title")

    def admin_title(self):
        return self.get_display(indent=True)

    admin_title.short_description = "Название"

    def get_count(self):
        qs = self.get_children_queryset()
        qs = qs.annotate(actual_count=Count("diafilms"))
        result = qs.values_list("actual_count", flat=True)
        result = self.diafilms.count() + sum(result)
        return result

    def save(self, **kwargs):
        # TODO: move to signal
        self.count = self.get_count()
        super().save(**kwargs)

        if self.parent:
            self.parent.save()

    def __str__(self):
        return f"{self.title}"

    def as_json(self):
        return {
            "pk": self.pk,
            "label": self.title,
            "quantity": getattr(self, "count", None),
            "coordinates": self.coordinates,
        }


class FlatSelect(Select):
    def get_choices_iterator(self, path):
        class QuerySetIterator:
            def __init__(self, path):
                self.path = path
                self.qs = None

            def __iter__(self):
                if self.qs is None:
                    app, model, field = self.path.split(".")
                    cls = apps.get_model(app, model)
                    qs = cls.objects.all().order_by()
                    qs = qs.values_list(field, flat=True).distinct()
                    self.qs = qs

                return ((x, x) for x in self.qs)

        return QuerySetIterator(path)

    def __init__(self, path, attrs=None):
        super(FlatSelect, self).__init__(attrs)
        self.choices = self.get_choices_iterator(path)


class Person(ClusterableModel, models.Model):
    """
    with pn as (
        SELECT
            p.id,
            p.full_name,
            SPLIT_PART(p.full_name, ' ', 1) l,
            LEFT(SPLIT_PART(p.full_name, ' ', 2), 1) f,
            LEFT(SPLIT_PART(p.full_name, ' ', 3), 1) m,
            CONCAT(SPLIT_PART(p.full_name, ' ', 1), ' ', LEFT(SPLIT_PART(p.full_name, ' ', 2), 1), LEFT(SPLIT_PART(p.full_name, ' ', 3), 1)) n
        FROM core_person AS p
    )

    SELECT p1.full_name, p2.full_name
    FROM pn p1
    LEFT JOIN pn p2 ON p1.n = p2.n AND p1.id != p2.id
    WHERE p2.full_name IS NOT NULL

    """
    ROLES_IMPORTANT = (
        "автор",
        "иллюстратор",
        "художник",
    )

    ROLES_SKIP = (
        "translator",
        "compiler",
        "другое",
        "прочие",
    )

    id = models.UUIDField(
        verbose_name="ID", primary_key=True,
        default=uuid.uuid4, editable=False,
    )
    photo = models.ForeignKey(
        'wagtailimages.Image', related_name='+', on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Фото",
    )
    full_name = models.CharField(verbose_name="Полное имя", max_length=255)
    birthday = models.DateField(verbose_name="Дата рождения", blank=True, null=True)
    description = models.TextField(
        verbose_name="Короткое описание",
        blank=True, null=True,
    )

    panels = [
        FieldPanel("full_name"),
        FieldPanel("birthday"),
        FieldPanel("description"),
        InlinePanel(
            "roles", label="Диафильмы",
            panels=[
                InstanceSelectorPanel("diafilm"),
                FieldPanel("role", widget=FlatSelect("core.DiafilmPerson.role")),
            ],
        ),
    ]

    class Meta:
        verbose_name = "Персона"
        verbose_name_plural = "Люди"
        ordering = ("full_name", )

    def age(self):
        if not self.birthday:
            return

        now = timezone.now()
        result = now.year - self.birthday.year
        if self.birthday.month < now.month:
            pass
        elif self.birthday.month > now.month:
            # месяц в будущем,
            # отнимаем год
            result -= 1
        elif self.birthday.day > now.day:
            # месяц тот же, но день в будущем,
            # тоже отнимаем год
            result -= 1

        return result

    def __str__(self):
        """
        Василий Леопольдович Диафильмов 1956 год рождения,
        советский режиссер и иллюстратор

        :return:
        """
        return (
            f"{self.full_name} "
            f"{self.birthday.year if self.birthday else 'неизвестного'} "
            f"года рождения"
        ).strip()

    def get_aliases(self):
        parts = self.full_name.split(" ")
        ln = parts.pop(0)
        fn = parts.pop(0) if parts else ""
        mn = parts.pop(0) if parts else ""
        aliases = [f"{ln} {fn[:1]}{mn[:1]}", f"{ln} {fn[:1]}"]
        return aliases


class DiafilmLocation(models.Model):
    id = models.UUIDField(
        verbose_name="ID", primary_key=True,
        default=uuid.uuid4, editable=False,
    )

    location = ParentalKey(
        "Location", on_delete=models.CASCADE,
        related_name="diafilms",
        verbose_name="Место",
    )

    diafilm = ParentalKey(
        "Diafilm", on_delete=models.CASCADE,
        related_name="locations",
        verbose_name="Диафильм",
    )

    class Meta:
        unique_together = ("location", "diafilm")


class DiafilmPerson(models.Model):
    id = models.UUIDField(
        verbose_name="ID", primary_key=True,
        default=uuid.uuid4, editable=False,
    )

    # person = models.ForeignKey(
    #     "core.Person", related_name="roles", on_delete=models.CASCADE,
    #     verbose_name="Персона", db_index=True,
    # )
    person = ParentalKey(
        "Person", on_delete=models.CASCADE,
        related_name="roles",
        verbose_name="Персона",
    )

    # diafilm = models.ForeignKey(
    #     "core.Diafilm", related_name="roles", on_delete=models.CASCADE,
    #     verbose_name="Диафильм", db_index=True,
    # )
    diafilm = ParentalKey(
        "Diafilm", on_delete=models.CASCADE,
        related_name="roles",
        verbose_name="Диафильм",
    )

    role = models.CharField(
        verbose_name="Роль", max_length=255,
        # choices=""  # Пока без чоисов, чтобы набить словарь значениями
    )

    @classmethod
    def role_choices(cls):
        result = getattr(cls, "_role_choices", None)
        if result is None:
            qs = cls.objects.values_list("role", flat=True).distinct().order_by("role")
            result = [(x, x) for x in qs.iterator()]
            setattr(cls, "_role_choices", result)

        return result

    class Meta:
        verbose_name = "Роль"
        verbose_name_plural = "Роли"
        unique_together = ("person", "diafilm", "role")
        # ordering = ("person", "")

    def save(self, *args, **kwargs):
        self.role = self.role.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        """
        15 - режиссер диафильма {455}

        :return:
        """
        return (
            f"{self.person_id} - {self.role}"
            f" диафильма {self.diafilm_id}"
        )

    def get_duplicates(self):
        d = {}
        r = []
        for p in Person.objects.all().prefetch_related("roles"):
            aliases = p.get_aliases()
            dfs = set(p.roles.all().values_list("diafilm_id", flat=True))
            for a in aliases:
                cp = d.get(a)
                if cp and cp[1].intersection(dfs):
                    mp, md = (
                         (p, dfs)
                         if len(p.full_name) > len(cp[0].full_name) else
                         (cp[0], cp[1])
                    )
                    r.append(((p, dfs), (cp[0], cp[1]), (mp, md)))

                d[a] = p, dfs


def get_elasticsearch():
    result = getattr(get_elasticsearch, "instance", None)
    if result is None:
        get_elasticsearch.instance = result = Elasticsearch(
            settings.ELASTICSEARCH_DSL,
        )

        index_exists = result.indices.exists(
            index=settings.ELASTICSEARCH_INDEX,
        )
        if not index_exists:
            result.indices.create(
                index=settings.ELASTICSEARCH_INDEX,
                body=settings.ELASTICSEARCH_SETTINGS,
            )

    return result


get_elasticsearch.instance = None


class OneToOneInlinePanel(InlinePanel):
    def on_model_bound(self):
        manager = getattr(self.model, self.relation_name)
        self.db_field = manager.related


class Diafilm(ClusterableModel, models.Model):
    # KIND_CHOICES = (
    #     (KIND_, ""),
    # )

    id = models.UUIDField(
        verbose_name="ID", primary_key=True,
        default=uuid.uuid4, editable=False,
    )
    title = models.CharField(verbose_name="Название", db_index=True, max_length=255)
    is_colored = models.BooleanField(
        verbose_name="Цветной?",
        default=True, db_index=True,
    )
    kind = models.CharField(verbose_name="Тип", db_index=True, max_length=100)

    eid = models.IntegerField(
        verbose_name="Внешний ID",
        db_index=True, unique=True,  # editable=False,
    )
    handle_id = models.IntegerField(
        verbose_name="Handle ID",
        db_index=True, unique=True,
    )
    source = models.TextField(
        verbose_name="Исходные данные",
        null=True, blank=True,
        help_text=(
            "Поле заполняется автоматическими инструментами из РГДБ"
        ),
    )
    doc = models.JSONField(
        verbose_name="Документ ElasticSearch",
        null=True, blank=True,
        help_text=(
            "Поле заполняется автоматическими инструментами "
            "из поля «Исходные данные» "
            "и синхронизируется с ElasticSearch"
        ),
    )

    history = models.JSONField(
        verbose_name="История изменений",
        null=True, blank=True,
        help_text=(
            "Надо писать изменения оригинальной инфы из РГДБ, "
            "например «{field: title, key: null, date: ..., old: 1, new: 2}», "
            "или {field: roles.full_name, key: Some guy, date: ..., old: 2, new: null}"
        )
    )

    panels = [
        FieldPanel("title"),
        FieldPanel("is_colored"),
        FieldPanel("kind", widget=FlatSelect("core.Diafilm.kind")),

        InlinePanel(
            "roles", label="Люди",
            panels=[
                InstanceSelectorPanel("person"),
                FieldPanel("role", widget=FlatSelect("core.DiafilmPerson.role")),
            ],
        ),
        InlinePanel(
            "locations", label="Места",
            panels=[
                InstanceSelectorPanel("location"),
            ],
        ),

        MultiFieldPanel(
            children=[
                ReadOnlyPanel("eid"),
                ReadOnlyPanel("handle_id"),
                CodePanel("source"),
                JSONPanel("doc"),
            ],
            heading="РГДБ/ElasticSearch",
            classname="collapsible collapsed",
        ),
    ]

    class Meta:
        verbose_name = "Диафильм"
        verbose_name_plural = "Диафильмы"
        ordering = ("title", )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._source = self.source

    def __str__(self):
        return f"{self.title} (№{self.eid} в РГДБ)"

    def save(self, **kwargs):
        if getattr(self, "doc", False) is True:
            self.history_update()
            self.doc_update()

        super().save(**kwargs)

    @property
    def school_subject(self):
        return self.doc.get("schoolsubj")

    @property
    def school_level(self):
        return self.doc.get("schoollevel")

    @property
    def paging(self):
        number_of_items = len(self.doc["pages"])
        frames = ", ".join([str(x) for x in self.doc["pages"]])
        return f"{number_of_items} дф. ({frames} кд.)"

    @property
    def issued_at(self):
        try:
            result = self.doc["dates"]["issued"]
        except IndexError:
            result = None
        else:
            result = datetime.fromisoformat(result).year

        return str(result)

    @cached_property
    def short_description(self):
        roles_qs = self.roles.filter(role__in=("автор", "художник"))
        doc = self.doc
        publisher = doc.get("publisher")

        return " / ".join([x for x in [
            self.title,
            ", ".join(
                f"{x.role} {x.person.full_name}"
                for x in roles_qs
            ),
            publisher,
            self.issued_at,
            self.paging,
        ] if x])

    @property
    def url(self):
        return f"{XMLUI_URL}/{self.handle}"

    @property
    def handle(self):
        return f"{BASE_HANDLE}/{self.handle_id}#page/0/mode/1up"

    @property
    def slug(self):
        raw = self.title
        raw = "".join([x for x in raw if x.isalnum() or x == " "])
        raw = " ".join([x for x in raw.split() if len(x) > 2])
        title = f"{self.eid} {raw}"
        return make_slug(title)

    @classmethod
    def from_api(cls, obj, only_fields=True):
        obj = {
            # За Володьку!
            "title": obj.title[:255],
            "is_colored": obj.color,
            "kind": obj.picturetype,
            "eid": obj.id,
            "handle_id": obj.handle_id,
            "source": "\n".join(obj.raw),
            "doc": obj.data,
        }

        if not only_fields:
            obj = cls(**obj)

        return obj

    def history_update(self):
        """
        По идее, если приехал новый документ,
        то историю можно стереть

        Если базовые поля приехали новые из РГДБ,
        то надо историю по ним затереть
        """
        pass

    def doc_update(self):
        """
        Тут надо по всем данным нагенерить новый документ
        За основу возьмем source, прогоним его через etl.diafilm
        Сверху надо накинуть того, что есть в джанге

        Вот как быть с персонами?
        Типа если мы кого-то в джанге убрали или переименовали, то это ок
        А если добавится кто-то из РГДБ, то как?

        Тогда лучше бы не удалять из джанги
        или добавлять в специальное поле
        """
        from etl.diafilm import ApiDiafilm
        obj = ApiDiafilm.from_source(
            doc_id=self.eid,
            data=self.source,
        )

        data = obj.data
        data.update({
            "title": self.title,
            "color": self.is_colored,
            "picturetype": self.kind,
        })

        for person in self.roles.select_related("person"):
            pass

        # Создаём локации из указанных в диафильме
        for location in data.get("locations", []):
            location_obj, created = Location.objects.get_or_create(
                title=location,
                defaults={
                    "coordinates": "",
                },
            )

        # Будем сразу делать страницы на диафильмы необпубликованные

        self.doc = data
        self.handle_id = data["handle"][1]
        self.elasticsearch_sync()

    def get_content_default(self):
        """
        нам нужен блок с фактами
        для людей работавших над диафильмом

        двухколоночный
        слева текст с описанием
        справа карусель фактов

        <StreamValue [
            <block facts: StructValue([
                ('title', ''),
                ('items', <StreamValue [
                    <block fact: StructValue([
                        ('name', '111'),
                        ('value', '222')
                    ])>,
                    <block fact: StructValue([
                        ('name', '222'),
                        ('value', '333')
                    ])>
                ]>)
            ])>,
            <block highlight: StructValue([
                ('title', 'Test'),
                ('text', <wagtail.core.rich_text.RichText object at 0x11278ad90>),
                ('type', 'box')
            ])>,
            StructValue([
                ('columns', <StreamValue [
                    <block content: <StreamValue [
                        <block text: <wagtail.core.rich_text.RichText object at 0x10ff16340>>
                    ]>>,
                    <block content: <StreamValue [
                        <block gallery: StructValue([
                            ('title', 'Фотогалерея'),
                            ('type', 'carousel'),
                            ('items', <StreamValue [
                                <block item: StructValue([
                                    ('image', <Image: Обложка диафильма «Маугли»>),
                                    ('caption', <wagtail.core.rich_text.RichText object at 0x10ffb6d90>)
                                ])>
                            ]>)
                        ])>
                    ]>>
                ]>)
            ])>
        ]>

        <block columns: StructValue([
            ('columns', <StreamValue [
                <block content: <StreamValue [
                    <block highlight: StructValue([
                        ('title', 'Содержание'),
                        ('text', <wagtail.core.rich_text.RichText object at 0x1127b9940>),
                        ('type', 'small')
                    ])>
                ]>>,
                <block content: <StreamValue [
                    <block gallery: StructValue([
                        ('title', 'Фотогалерея'),
                        ('type', 'carousel'),
                        ('items', <StreamValue []>)
                    ])>
                ]>>
            ]>
        ]>
        """
        from wagtail.core.rich_text import RichText

        from core.blocks import FactsStreamBlock, HighlightBlock
        from core.blocks.media import FactBlock

        role_qs = self.roles.exclude(role__in=("обработчик", "другое"))
        role_qs = role_qs.select_related("person")
        return (
            block(
                FactsStreamBlock, "facts",
                title="",
                items=[
                    block(
                        FactBlock, "fact",
                        name=x.role,
                        value=x.person.full_name,
                    )
                    for x in role_qs
                ],
            ),
            block(
                ColumnsStreamBlock, "columns",
                columns=[
                    block(
                        ColumnStreamBlock, "content",
                        content=[
                            block(
                                HighlightBlock, "highlight",
                                title="Содержание",
                                text=RichText(f"<p>{self.doc.get('content', '')}</p>"),
                                type="small",
                            ),
                        ],
                    ),
                    block(
                        ColumnStreamBlock, "content",
                        content=[
                            block(
                                GalleryStreamBlock, "gallery",
                                title="Интересные факты",
                                type="carousel",
                                items=[],
                            ),
                        ],
                    ),
                ],
            ),
        )

    def get_cover_image(self):
        from io import BytesIO

        import requests
        from django.core.files.images import ImageFile
        from wagtail.images.models import Image

        cover_title = f"Обложка диафильма «{self.title[:200]}»"
        url = self.doc["cover"]
        try:
            response = requests.get(url)
        except Exception as exc:
            logger.error(
                "Cover download failed: %s (%s, %s)",
                exc, self.eid, url,
                exc_info=True,
            )

            return

        if response.status_code != requests.codes.ok:
            logger.error(
                "Cover download failed: %s (%s, %s)",
                response.status_code, self.eid, url,
            )

        image = None

        ext = url.split("/")[-1].rsplit(".", 1)[-1]
        filename = f"{self.slug}_cover.{ext}"

        fp = BytesIO()
        fp.write(response.content)
        fp = ImageFile(fp, name=filename)
        if fp.width and fp.height:
            image = Image(
                file=fp,
                title=cover_title,
            )
            image.save()
        else:
            logger.error(
                "Cover upload failed: bad file (%s, %s)",
                self.eid, url,
            )

        return image

    def handle_related_locations(self):
        for location in self.doc["locations"]:
            obj, created = Location.objects.get_or_create(title=location)
            DiafilmLocation.objects.get_or_create(location=obj, diafilm=self)

    def handle_related_persons(self):
        for item in self.doc["persons"]:
            obj, created = Person.objects.get_or_create(
                full_name=item["name"],
            )
            DiafilmPerson.objects.get_or_create(
                person=obj, diafilm=self,
                role=item["role"],
            )

    def handle_related_page(self):
        from core.models import IndexViewingHallPage
        parent = "Каталог"
        parent = IndexViewingHallPage.objects.filter(title=parent).first()
        from core.models import DiafilmPage
        page_cls = DiafilmPage

        cover_tags = ["диафильм", "обложка"]

        # Создадим страницу, если её ещё нет
        page = DiafilmPage.objects.filter(diafilm=self).first()
        if not page:
            page = page_cls(
                title=self.title,
                draft_title=self.title,
                slug=self.slug,
                diafilm=self,
                live=False,
            )

            page.content = ""
            parent.add_child(instance=page)
            page.save_revision()

        # Дальше уже работаем с объектом
        # и тут надо просто насоздавать блоков
        image = page.annotation_image
        if not image:
            image = self.get_cover_image()

        if image:
            image.tags.add(*cover_tags)
            page.annotation_image = image

        content = [(k, v) for k, v in self.get_content_default() if v]
        page.content = content

        page.save_revision().publish()

        return True

    def elasticsearch_delete(self):
        es = get_elasticsearch()

        try:
            es.delete(
                index=settings.ELASTICSEARCH_INDEX,
                id=str(self.eid),
            )
        except Exception as exc:
            logger.error("Elasticsearch error: %s", exc, exc_info=True)

    def elasticsearch_sync(self, replace=False):
        """
        Тут надо просто закинуть документ в эластик по сеттингам
        Мы уже делали это для ETL
        """
        es = get_elasticsearch()

        if replace:
            self.elasticsearch_delete()

        try:
            es.update(
                index=settings.ELASTICSEARCH_INDEX,
                id=str(self.eid),
                doc=self.doc,
                doc_as_upsert=True,
            )

            es.indices.refresh()
        except Exception as exc:
            logger.error("Elasticsearch error: %s", exc, exc_info=True)


class Subscription(models.Model):
    STATUS_NEW = "new"
    STATUS_CONFIRMED = "confirmed"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = (
        (STATUS_NEW, "Новая"),
        (STATUS_CONFIRMED, "Подтвержденная"),
        (STATUS_REJECTED, "Отмененная"),
    )

    email = models.EmailField(verbose_name="Адрес")
    status = models.CharField(
        verbose_name="Статус",
        max_length=10,
        choices=STATUS_CHOICES, default=STATUS_NEW,
    )
    created_at = models.DateTimeField(
        verbose_name="Создана",
        auto_now_add=True,
    )

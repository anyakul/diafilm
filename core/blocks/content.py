from django import forms
from django.apps import apps
from django.template.loader import select_template
from django.utils.functional import cached_property
from wagtail.core.blocks import (BooleanBlock, CharBlock, ChoiceBlock,
                                 EmailBlock, IntegerBlock, MultipleChoiceBlock,
                                 PageChooserBlock, RichTextBlock, StreamBlock,
                                 StructBlock, URLBlock)
from wagtail.images.blocks import ImageChooserBlock

from core.blocks.text import PoorRichTextBlock


class BaseContentBlock(StructBlock):
    title = CharBlock(label="Заголовок", required=False)
    text = PoorRichTextBlock(label="Текст", required=False)
    is_published = BooleanBlock(label="Видимый", default=True, required=False)

    class Meta:
        icon = "doc-empty-inverse"
        template = "blocks/content_block.html"
        label = "Контент"


class EquipmentSimilarBlock(BaseContentBlock):
    number = IntegerBlock(label="Количество", required=False)

    class Meta:
        icon = "duplicate"
        template = "blocks/equipment_similar.html"
        label = "Похожие проекторы"


class Equipment3DBlock(StructBlock):
    url = URLBlock(label="Адрес")
    preview = ImageChooserBlock()

    class Meta:
        icon = "media"
        template = "blocks/equipment_3d.html"
        label = "3D-плеер"


class DiafilmPlayerBlock(BaseContentBlock):
    page = PageChooserBlock("core.DiafilmPage", label="Диафильм")

    class Meta:
        icon = "media"
        template = "blocks/diafilm_player.html"
        label = "Плеер"


class MemberTeamBlock(StructBlock):
    name = CharBlock(label="Имя")
    email = EmailBlock(label="Email", required=False)
    caption = CharBlock(label="Подпись")
    photo = ImageChooserBlock(label="Фотография", required=False)

    # Может завязывать на реальных людей в нашей базе
    # person = InstanceSelectBlock()

    class Meta:
        icon = "user"
        label = "Человек"


class TeamBlock(StructBlock):
    title = CharBlock(label="Заголовок")
    caption = CharBlock(label="Подпись")
    members = StreamBlock([
        ("member", MemberTeamBlock()),
    ], label="Люди")

    class Meta:
        icon = "group"
        template = "blocks/team.html"
        label = "Команда"


class ConceptBlock(StructBlock):
    title = CharBlock(label="Заголовок")
    conception = PoorRichTextBlock(label="Концепция")
    text = RichTextBlock(label="Текст")
    fig1 = ImageChooserBlock(label="Иллюстрация у текста", required=False)
    fig2 = ImageChooserBlock(label="Иллюстрация у края страницы", required=False)

    class Meta:
        icon = "form"
        template = "blocks/concept.html"
        label = "Концепция"


class QuotesBlock(BaseContentBlock):
    count = IntegerBlock(label="Количество цитат")
    ordering = ChoiceBlock(choices=(
        ("-pk", "Последние"),
        ("?", "Вперемешку"),
    ), label="Сортировка")

    class Meta:
        icon = "form"
        template = "blocks/quotes.html"
        label = "Цитаты"


class ArtistsBlock(BaseContentBlock):
    class RolesChoices:
        def __iter__(self):
            cls = apps.get_model("core", "DiafilmPerson")
            result = cls.role_choices()
            return iter(result)

    roles = MultipleChoiceBlock(label="Роли", choices=RolesChoices)
    style = ChoiceBlock(label="Вид отображения", choices=(
        ("full", "Полный"),
        ("short", "Короткий"),
    ), default="full")

    class Meta:
        icon = "doc-empty-inverse"
        template = "blocks/artists.html"
        label = "Галерея художников"


class NewsBlock(BaseContentBlock):
    class Meta:
        template = "blocks/news.html"
        label = "Новости"


class DiafilmsBlock(BaseContentBlock):
    style = ChoiceBlock(label="Вид отображения", choices=(
        ("full", "Полный"),
        ("short", "Короткий"),
    ), default="full")

    class Meta:
        template = "blocks/diafilms.html"
        label = "Галерея диафильмов"


class CollectionsBlock(BaseContentBlock):
    class Meta:
        template = "blocks/collections.html"
        label = "Список подборок"


class DiafilmSimilarBlock(BaseContentBlock):
    number = IntegerBlock(label="Количество", required=False)

    class Meta:
        icon = "duplicate"
        template = "blocks/diafilm_similar.html"
        label = "Карусель диафильмов"


class PublicationSimilarBlock(BaseContentBlock):
    class TypeChoices:
        def __iter__(self):
            from core.models import CONTENT_PAGES_CHOICES
            return iter(CONTENT_PAGES_CHOICES)

    page = PageChooserBlock(label="Родительская страница")
    type = ChoiceBlock(label="Тип страниц", required=False, choices=TypeChoices)
    number = IntegerBlock(label="Количество", required=False)

    ordering = ChoiceBlock(
        label="Сортировка", required=False,
        choices=(
            ("-pk", "Последние добавленные"),
            ("?", "Вперемешку"),
        ),
    )

    style = ChoiceBlock(
        label="Стиль отображения", required=False,
        choices=(
            ("bg-white", "Белый"),
            ("bg-gray", "Серый"),
        ),
    )

    def render(self, value, context):
        """
        Сохраняет текущие значения блока
        для использования в методах
        """
        self.value = value
        return super().render(value, context)

    @cached_property
    def cls(self):
        type_id = self.value.get("type") or getattr(self, "type_id", None)
        from core.models import CONTENT_PAGES
        cls = type_id and CONTENT_PAGES.get(type_id)
        return cls

    def filter_qs(self, qs):
        return qs

    def get_qs(self, cls):
        qs = cls.objects.live().public()
        qs = qs.child_of(self.value["page"])
        qs = self.filter_qs(qs)

        ordering = self.value["ordering"]
        if ordering:
            qs = qs.order_by(ordering)

        number = self.value["number"]
        if number:
            qs = qs[:number]

        return qs

    def get_similar(self):
        cls = self.cls
        if not cls:
            return

        cls_name = cls.__name__.lower()

        return {
            "object_list": self.get_qs(cls),
            "html_class": cls.html_class,
            "class": getattr(cls, "html_class_detail", "default"),
            "template": select_template([
                f"components/similar/detail_{cls_name}.html",
                "components/similar/detail_default.html",
            ]),
            "cls": cls_name,
        }

    class Meta:
        icon = "duplicate"
        template = "blocks/publication_similar.html"
        label = "Карусель публикаций"


class NewsSimilarBlock(PublicationSimilarBlock):
    type_id = "NewsPage"

    class NewsChoices:
        def __iter__(self):
            from core.models import NewsPage
            return iter(NewsPage.CATEGORY_CHOICES)

    category = ChoiceBlock(
        label="Категория", required=False,
        choices=NewsChoices,
    )
    ordering = ChoiceBlock(
        label="Сортировка", required=False,
        choices=(
            ("-published_at", "Последние опубликованные"),
            ("?", "Вперемешку"),
        ),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.child_blocks.pop("type")

    def filter_qs(self, qs):
        category = self.value["category"]
        if category:
            qs = qs.filter(category=category)

        return qs

    class Meta:
        icon = "duplicate"
        template = "blocks/publication_similar.html"
        label = "Карусель новостей"


class CollectionGalleryBlock(BaseContentBlock):
    class CollectionChoices:
        def __iter__(self):
            cls = apps.get_model("wagtailcore", "Collection")
            result = [(x.pk, x.name) for x in cls.objects.all()]
            return iter(result)

    collection_id = ChoiceBlock(label="Коллекция", choices=CollectionChoices)

    class Meta:
        icon = "folder"
        template = "blocks/image_collection_gallery.html"
        label = "Карусель из коллекции"


class FilterPlaceBlock(BaseContentBlock):
    class Meta:
        icon = "form"
        template = "blocks/filter_place.html"
        label = "Фильтр по местам"


class FilterSchoolBlock(BaseContentBlock):
    class Meta:
        icon = "form"
        template = "blocks/filter_school.html"
        label = "Фильтр для школьников"


class ViewingHallBlock(BaseContentBlock):
    main = PageChooserBlock("core.DiafilmPage", label="Главный диафильм")
    collection = PageChooserBlock(
        "core.CollectionPage", label="Коллекция",
        required=False,
    )

    class Meta:
        icon = "form"
        template = "blocks/viewing_hall.html"
        label = "Просмотровый зал"


class EquipmentSchemeBlock(BaseContentBlock):
    page = PageChooserBlock(
        "core.ArtifactPage", label="Проектор",
    )

    class Meta:
        icon = "form"
        template = "blocks/equipment_scheme.html"
        label = "Схема проектора"

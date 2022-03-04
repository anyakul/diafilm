from django.utils.functional import cached_property
from wagtail.core.blocks import (BooleanBlock, CharBlock, ChoiceBlock,
                                 EmailBlock, ListBlock, PageChooserBlock,
                                 StructBlock)
from wagtail.images.blocks import ImageChooserBlock
from wagtailsvg.blocks import SvgChooserBlock
from wagtailsvg.widgets import AdminSvgChooser

from core.blocks import FactsStreamBlock
from core.blocks.text import PoorRichTextBlock
from wagtail_pointsblock.blocks import PointsStreamBlock


class LampBlock(StructBlock):
    image = ImageChooserBlock(label="Изображение")
    power = CharBlock(label="Мощность")
    frame = CharBlock(label="Размер кадра")

    class Meta:
        icon = "form"
        template = "blocks/lamp.html"
        label = "Лампа"


class AdminBigSvgChooser(AdminSvgChooser):
    class Media(AdminSvgChooser.Media):
        js = AdminSvgChooser.Media.js + ["wagtail_pointsblock/js/admin.js"]
        css = {"all": ["wagtail_pointsblock/css/admin.css"]}


class BigSvgChooserBlock(SvgChooserBlock):
    @cached_property
    def widget(self):
        return AdminBigSvgChooser()


class SVGPointsStreamBlock(PointsStreamBlock):
    image = BigSvgChooserBlock(label="Изображение")


class EquipmentBlock(StructBlock):
    year_begin = CharBlock(label="Начало производства")
    year_end = CharBlock(label="Конец производства")
    manufacturer = CharBlock(label="Производитель")
    description = PoorRichTextBlock(label="Описание")
    scheme = SVGPointsStreamBlock(label="Схема")

    class Meta:
        icon = "form"
        template = "blocks/equipment.html"
        label = "Проектор"


class ContactsBlock(StructBlock):
    form_show = BooleanBlock(label="Показывать форму?", default=True)
    form_title = CharBlock(label="Заголовок формы", default="Обратная связь", required=False)

    title = CharBlock(label="Заголовок", default="Контакты")
    text = PoorRichTextBlock(label="Текст")

    email = EmailBlock(label="Почта", required=False)
    phone = CharBlock(label="Телефон", required=False)

    class Meta:
        icon = "form"
        template = "blocks/contacts.html"
        label = "Контакты"


class AnnouncementBlock(StructBlock):
    KIND_NORMAL = "normal"
    KIND_INVERTED = "inverted"
    KIND_LARGE = "inverted_large"
    KIND_MIXED = "mixed"
    KIND_CHOICES = (
        (KIND_NORMAL, "Слева большая картинка и если есть маленькая"),
        (KIND_INVERTED, "Справа одна или две картинки"),
        (KIND_LARGE, "Справа большая картинка"),
        (KIND_MIXED, "Ссылка между двумя картинками"),
    )

    title = CharBlock(label="Заголовок")
    text = PoorRichTextBlock(label="Текст")
    page = PageChooserBlock()

    kind = ChoiceBlock(label="Как выводить", choices=KIND_CHOICES)
    images = ListBlock(ImageChooserBlock, label="Изображения")

    class Meta:
        icon = "link"
        template = "blocks/announcement.html"
        label = "Анонс"


class PersonBlock(StructBlock):
    photo = ImageChooserBlock(label="Фото")
    fact = FactsStreamBlock(label="Факты")

    class Meta:
        icon = "user"
        template = "blocks/person.html"
        label = "Художник"


class DiafilmLinkBlock(StructBlock):
    page = PageChooserBlock("core.DiafilmPage", label="Диафильм")
    caption = CharBlock(
        label="Текст ссылки", required=False,
        help_text="Если пустой, то будет сгенерирован автоматически",
    )

    class Meta:
        icon = "link"
        template = "blocks/diafilm_link.html"
        label = "Ссылка на диафильм"


class ShareBlock(StructBlock):
    class Meta:
        icon = "link-external"
        template = "blocks/share.html"
        label = "Поделиться в соц. сетях"

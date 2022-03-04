from django import forms
from django.core.exceptions import ValidationError
from django.utils.translation import ugettext_lazy as _
from wagtail.core.blocks import (CharBlock, ChoiceBlock, ListBlock,
                                 StreamBlock, StructBlock, TextBlock)
from wagtail.documents.blocks import DocumentChooserBlock
from wagtail.embeds.blocks import EmbedBlock
from wagtail.images.blocks import ImageChooserBlock

from core.blocks.text import PoorRichTextBlock


class ImageBlock(StructBlock):
    """
    Custom `StructBlock` for utilizing images with associated caption and
    attribution data
    """
    image = ImageChooserBlock(label="Изображения", required=True)
    caption = TextBlock(label="Подпись", required=False, rows=2)
    # type = ChoiceBlock(
    #     label="Тип",
    #     choices=[
    #         ("figure", "Иллюстрация"),
    #         ("banner", "Баннер"),
    #         ("picture", "Изображение"),
    #     ],
    #     default="figure",
    # )
    size = ChoiceBlock(
        label="Размер",
        choices=(
            ("small", "Маленький"),
            ("medium", "Средний"),
            ("large", "Большой"),
        ),
        default="medium",
    )

    class Meta:
        icon = "image"
        template = "blocks/image.html"
        label = "Изображение"


class GalleryImageBlock(StructBlock):
    image = ImageChooserBlock(label="Изображение")
    caption = PoorRichTextBlock(label="Текст")

    class Meta:
        label = "Позиция"


class GalleryStreamBlock(StructBlock):
    title = CharBlock(label="Заголовок", required=False, default="Фотогалерея")
    type = ChoiceBlock(label="Тип", choices=(
        ("gallery", "Галерея"),
        ("carousel", "Карусель"),
    ), default="gallery")
    items = StreamBlock(
        [('item', GalleryImageBlock())],
        label="Изображения",
        required=False,
    )

    class Meta:
        icon = "folder"
        template = "blocks/gallery.html"
        label = "Галерея"


def validate_number(value):
    if not value.isdigit():
        raise ValidationError(_("Required number"))


class FactBlock(StructBlock):
    name = CharBlock(label="Название", required=True)
    value = TextBlock(label="Текст", required=True, rows=2)

    class Meta:
        label = "Факт"


class FactsStreamBlock(StructBlock):
    title = CharBlock(label="Заголовок", required=False)
    items = StreamBlock(
        [("fact", FactBlock())],
        label="Список фактов",
    )

    class Meta:
        icon = "order"
        template = "blocks/facts.html"
        label = "Факты"


class EmbedCustomBlock(EmbedBlock):
    class Meta:
        help_text = (
            "Вставьте ссылку, "
            "например https://www.youtube.com/embed/SGJFWirQ3ks"
        )
        icon = "media"
        template = "blocks/embed.html"
        label = "Медиа"


class VideoBlock(StructBlock):
    code = CharBlock(label="Код youtube-видео для встройки")
    preview = ImageChooserBlock(label="Превью", required=False)
    caption = CharBlock(label="Подпись", required=False)

    class Meta:
        icon = "media"
        template = "blocks/video.html"
        label = "Youtube-видео"


class VideoGalleryBlock(StructBlock):
    title = CharBlock(label="Заголовок", required=False)
    text = PoorRichTextBlock(label="Текст", required=False)
    items = StreamBlock([
        ("video", VideoBlock())
    ], label="Видео")

    class Meta:
        icon = "folder"
        template = "blocks/video_gallery.html"
        label = "Youtube-галерея"


class RawBlock(TextBlock):
    widget = forms.Textarea

    class Meta:
        icon = "code"
        # render_basic without template
        # template = "blocks/raw.html"
        label = "Просто текст"


class ViewerBlock(StructBlock):
    type = ChoiceBlock(label="Содержимое", choices=(
        ("youtube", "YouTube-видео"),
        ("pdf", "PDF-документ"),
        ("iframe", "3D-плеер"),
    ))
    url = CharBlock(label="Ссылка или Youtube ID")
    preview = ImageChooserBlock(label="Превью")
    caption = PoorRichTextBlock(label="Подпись", required=False)

    class Meta:
        icon = "media"
        template = "blocks/viewer.html"
        label = "Просмотр материалов"


class DocumentViewerBlock(StructBlock):
    document = DocumentChooserBlock(label="Документ")
    preview = ImageChooserBlock(label="Превью")

    class Meta:
        icon = "search"
        template = "blocks/viewer_document.html"
        label = "Документ"

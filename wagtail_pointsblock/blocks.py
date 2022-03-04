
from django.utils.functional import cached_property
from wagtail.core.blocks import (CharBlock, ChoiceBlock, ListBlock,
                                 StructBlock, TextBlock, StreamBlock, RichTextBlock)
from wagtail.images.blocks import ImageChooserBlock

from core.blocks.text import PoorRichTextBlock


class BigImageChooserBlock(ImageChooserBlock):
    @cached_property
    def widget(self):
        from .widgets import AdminImageChooser
        # from wagtail.images.widgets import AdminImageChooser
        instance = AdminImageChooser()

        return instance
        # return BigAdminImageChooser()


class PointBlock(StructBlock):
    coords = CharBlock(label="Координаты", default="50,50", is_inline=True)
    image = ImageChooserBlock(label="Изображение", required=False)
    text = PoorRichTextBlock(label="Текст", required=False)


class PointsStreamBlock(StructBlock):
    image = BigImageChooserBlock(label="Изображение")
    points = StreamBlock([
        ('point', PointBlock())
    ], label="Метки")

    class Meta:
        icon = "grip"
        label = "Отметки на картинке"

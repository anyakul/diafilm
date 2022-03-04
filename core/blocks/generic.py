from wagtail.core.blocks import CharBlock, ChoiceBlock, StructBlock, TextBlock
from wagtail.images.blocks import ImageChooserBlock


class ImageBlock(StructBlock):
    """
    Custom `StructBlock` for utilizing images with associated caption and
    attribution data
    """
    image = ImageChooserBlock(required=True)
    caption = CharBlock(required=False)
    attribution = CharBlock(required=False)

    class Meta:
        icon = "image"
        template = "blocks/image.html"


class HeadingBlock(StructBlock):
    """
    Custom `StructBlock` that allows the user to select h2 - h4 sizes for headers
    """
    heading_text = CharBlock(classname="Текст", required=True)
    size = ChoiceBlock(choices=[
        ("", "Размер заголовка"),
        ("h2", "H2"),
        ("h3", "H3"),
        ("h4", "H4")
    ], blank=True, required=False)

    class Meta:
        icon = "title"
        template = "blocks/heading.html"


class BlockQuote(StructBlock):
    """
    Custom `StructBlock` that allows the user to attribute a quote to the author
    """
    text = TextBlock()
    attribute_name = CharBlock(
        blank=True,
        required=False,
        label="e.g. Mary Berry",
    )

    class Meta:
        icon = "fa-quote-left"
        template = "blocks/blockquote.html"

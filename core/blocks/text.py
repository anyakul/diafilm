from wagtail.core.blocks import (CharBlock, ChoiceBlock, RichTextBlock,
                                 StructBlock, TextBlock)
from wagtail.images.blocks import ImageChooserBlock


class BaseRichTextBlock(RichTextBlock):
    class Meta:
        icon = "doc-full"
        template = "blocks/paragraph.html"
        label = "Текст"


class ShortRichTextBlock(RichTextBlock):
    class Meta:
        icon = "doc-full"
        template = "blocks/paragraph.html"
        label = "Текст"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.features = [
            "bold", "italic",
            "ol", "ul",
            "hr",
            "link", "document-link",
            "typograf",
        ]


class PoorRichTextBlock(RichTextBlock):
    class Meta:
        icon = "doc-full"
        template = "blocks/paragraph.html"
        label = "Текст"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.features = [
            "h2", "h3",
            "bold", "italic",
            "ol", "ul",
            "typograf",
        ]


class HeadingBlock(StructBlock):
    heading_text = CharBlock(
        label="Текст", required=True,
    )
    size = ChoiceBlock(
        label="Размер",
        blank=True, required=False,
        choices=[
            ("", "Размер заголовка"),
            ("h2", "H2"),
            ("h3", "H3"),
            ("h4", "H4"),
        ],
    )

    class Meta:
        icon = "title"
        template = "blocks/heading.html"
        label = "Заголовок"


class BlockQuoteBlock(StructBlock):
    text = PoorRichTextBlock(label="Текст")
    attribution = TextBlock(
        label="Автор",
        blank=True,
        required=False,
    )

    class Meta:
        icon = "openquote"
        template = "blocks/blockquote.html"
        label = "Цитата"


class HighlightBlock(StructBlock):
    title = TextBlock(label="Заголовок", required=False)
    text = PoorRichTextBlock(label="Текст")
    type = ChoiceBlock(
        label="Тип выделения",
        choices=[
            ("quote", "Цитата"),
            ("box", "Врезка"),
            ("large", "Увеличенный"),
            ("small", "Уменьшенный"),
        ],
        default="box",
    )

    class Meta:
        icon = "openquote"
        template = "blocks/highlight.html"
        label = "Выделенный текст"

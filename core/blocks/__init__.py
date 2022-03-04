from django.utils.html import format_html_join
from wagtail.core.blocks import CharBlock, StreamBlock, StructBlock

from core.blocks.content import (ArtistsBlock, CollectionGalleryBlock,
                                 CollectionsBlock, ConceptBlock,
                                 DiafilmPlayerBlock, DiafilmsBlock,
                                 DiafilmSimilarBlock, Equipment3DBlock,
                                 EquipmentSchemeBlock, EquipmentSimilarBlock,
                                 FilterPlaceBlock, FilterSchoolBlock,
                                 NewsBlock, NewsSimilarBlock,
                                 PublicationSimilarBlock, QuotesBlock,
                                 TeamBlock, ViewingHallBlock)
from core.blocks.media import (DocumentViewerBlock, FactsStreamBlock,
                               GalleryStreamBlock, ImageBlock, RawBlock,
                               VideoGalleryBlock, ViewerBlock)
from core.blocks.specific import (AnnouncementBlock, ContactsBlock,
                                  DiafilmLinkBlock, EquipmentBlock, LampBlock,
                                  PersonBlock, ShareBlock)
from core.blocks.text import (BaseRichTextBlock, BlockQuoteBlock, HeadingBlock,
                              HighlightBlock)

try:
    from wagtail_pointsblock.blocks import PointsStreamBlock
except ImportError:
    PointsStreamBlock = RawBlock


class BaseBlockCollection(StreamBlock):
    heading = HeadingBlock()
    text = BaseRichTextBlock()
    highlight = HighlightBlock()

    image = ImageBlock()
    gallery = GalleryStreamBlock()
    collection_gallery = CollectionGalleryBlock()

    diafilm_link = DiafilmLinkBlock()
    viewer = ViewerBlock()
    viewer_document = DocumentViewerBlock()

    share = ShareBlock()


class ArtifactBlockCollection(BaseBlockCollection):
    points = EquipmentBlock()
    lamp = LampBlock()


class ArtifactColumnBlockCollection(ArtifactBlockCollection):
    viewer = ViewerBlock()
    equipment_3d = Equipment3DBlock()


class CafeteriaBlockCollection(BaseBlockCollection):
    quotes = QuotesBlock()
    concept = ConceptBlock()
    team = TeamBlock()
    contacts = ContactsBlock()
    news = NewsBlock()


class FoyerBlockCollection(BaseBlockCollection):
    video_gallery = VideoGalleryBlock()
    viewing_hall = ViewingHallBlock()
    school_block = FilterSchoolBlock()
    place_block = FilterPlaceBlock()
    equipment_scheme = EquipmentSchemeBlock()
    diafilm_player = DiafilmPlayerBlock()


class ContentBlockCollection(BaseBlockCollection):
    announcement = AnnouncementBlock()
    # player = PlayerBlock()
    facts = FactsStreamBlock()
    person = PersonBlock()

    artists = ArtistsBlock()
    diafilms = DiafilmsBlock()
    collections = CollectionsBlock()

    diafilm_similar = DiafilmSimilarBlock()
    publication_similar = PublicationSimilarBlock()
    news_similar = NewsSimilarBlock()
    equipment_similar = EquipmentSimilarBlock()


class ColumnStreamBlock(StreamBlock):
    content = ArtifactColumnBlockCollection(label="Содержание")

    class Meta:
        label = "Колонка"


class ColumnsStreamBlock(StructBlock):
    columns = ColumnStreamBlock()

    class Meta:
        icon = "placeholder"
        template = "blocks/columns.html"
        label = "Колонки"
        block_counts = {"columns": 2, "column": 2}


class TabBlock(StructBlock):
    title = CharBlock(label="Название")
    slug = CharBlock(label="Псевдоним")
    content = CafeteriaBlockCollection(label="Содержание")


class TabsStreamBlock(StructBlock):
    tabs = StreamBlock(
        [("tab", TabBlock())],
        label="Вкладка",
    )

    class Meta:
        template = "blocks/tabs.html"
        label = "Вкладки"


# StreamBlocks
class BaseStreamBlock(FoyerBlockCollection, ArtifactBlockCollection,
                      CafeteriaBlockCollection, ContentBlockCollection,
                      BaseBlockCollection):
    """
    Define the custom blocks that `StreamField` will utilize
    """


class ContentStreamBlock(BaseStreamBlock):
    """
    Контейнер с расширенными возможностями для контентной части
    """
    columns = ColumnsStreamBlock()
    tabs = TabsStreamBlock()


class RawStreamBlock(StreamBlock):
    """
    Специальный контейнер для чанков
    """
    text_rich = BaseRichTextBlock()
    raw = RawBlock()

    def render_basic(self, value, context=None):
        """
        Чтобы стримблок не оборачивал входящие в него блоки в дивы
        :param value:
        :param context:
        :return:
        """
        return format_html_join(
            '\n', '{0}',
            [
                (child.render(context=context), child.block_type)
                for child in value
            ]
        )

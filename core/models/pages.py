"""

Базовые
- Индексы (для иерархии)
- Статьи
-- Новости
-- Публикации
-- Оборудование
-- Персоны (Художники)
-- Диафильмы
-- Коллекции (Подборки)


"""
from django.conf import settings
from django.db import models
from django.http import HttpResponseRedirect
from django.template import Template
from django.template.loader import render_to_string, select_template
from django.utils import timezone
from django.utils.functional import cached_property
from instance_selector.edit_handlers import InstanceSelectorPanel
from modelcluster.fields import ParentalKey, ParentalManyToManyField
from wagtail.admin.edit_handlers import (FieldPanel, FieldRowPanel,
                                         InlinePanel, MultiFieldPanel,
                                         PageChooserPanel, StreamFieldPanel)
from wagtail.core.fields import StreamField
from wagtail.core.models import Orderable, Page
from wagtail.images.edit_handlers import ImageChooserPanel
from wagtail.search import index
from wagtail.snippets.edit_handlers import SnippetChooserPanel
from wagtailsvg.edit_handlers import SvgChooserPanel

from ..blocks import BaseStreamBlock, ContentStreamBlock, TabsStreamBlock


class IndexPageMixin:
    is_index = True
    html_class = "main"
    html_level = 0


class FoyerPageMixin:
    html_class = "foyer"
    html_level = 1


class ShowroomPageMixin:
    html_class = "showroom"
    html_level = 2


class ViewingHallPageMixin:
    html_class = "viewing-hall"
    html_level = 3


class GalleryPageMixin:
    html_class = "gallery"
    html_level = 4


class ArchivePageMixin:
    html_class = "archive"
    html_level = 5


class CafeteriaPageMixin:
    html_class = "cafeteria"
    html_level = 6

    content_block_types = (
        ("tabs", TabsStreamBlock()),
    )


class BasePage(Orderable, Page):
    banner = models.ForeignKey(
        "wagtailimages.Image", on_delete=models.SET_NULL, related_name="+",
        verbose_name="Баннер",
        null=True, blank=True,
        help_text="Также используется как изображение для шаринга страницы в соцсетях",
    )
    annotation = models.TextField(
        verbose_name="Краткое описание",
        blank=True, null=True,
        max_length=255,
        help_text="",
    )

    keywords = models.TextField(
        verbose_name="Ключевики",
        blank=True, default="",
        help_text="Через запятую, без пробелов."
    )
    redirect_to = models.ForeignKey(
        Page, on_delete=models.SET_NULL, related_name="+",
        verbose_name="Перенаправить на страницу",
        blank=True, null=True,
    )

    # menu_settings
    menu_title = models.CharField(
        "Название в меню", max_length=255,
        blank=True, null=True,
        help_text="если не указано – будет, как заголовок страницы",
    )

    content = StreamField(
        verbose_name="Содержание",
        block_types=ContentStreamBlock,
        blank=True,
    )

    # objects = DefaultPageManager()

    content_panels = Page.content_panels + [
        ImageChooserPanel("banner"),
        FieldPanel("annotation", classname="full"),
        StreamFieldPanel("content"),
    ]

    promote_panels = [
        MultiFieldPanel([
            FieldPanel("slug"),
            FieldPanel("seo_title"),
            FieldPanel("search_description", classname="full"),
            FieldPanel("keywords"),
        ], heading="Настройки для поиска и отображения в соцсетях")
    ]

    settings_panels = [
        MultiFieldPanel([
            FieldPanel("show_in_menus"),
            FieldPanel("menu_title"),
        ], heading="Меню"),
        PageChooserPanel("redirect_to"),
    ] + Page.settings_panels

    search_fields = Page.search_fields + [
        index.SearchField("search_description"),
        index.SearchField("keywords"),
        index.SearchField('content'),
    ]

    override_translatable_fields = [
        # SynchronizedField('slug'),
    ]

    class Meta:
        abstract = True
        ordering = ["sort_order"]

    def get_template(self, request, *args, **kwargs):
        """
        if class is IndexPage and slug is cafeteria,
        templates will be:
            core/index_page-cafeteria-ru-ru.html
            core/index_page-cafeteria.html
            core/index_page.html
        """
        result = super().get_template(request, *args, **kwargs)
        path, filename = result.rsplit("/", 1)
        filename, ext = filename.rsplit(".", 1)
        # language_code = get_locale().language_code
        language_code = settings.LANGUAGE_CODE
        result = [
            f"{path}/{filename}-{self.slug}-{language_code}.{ext}",
            f"{path}/{filename}-{self.slug}.{ext}",
            result,
        ]
        # print(result)
        return result

    def serve(self, request, *args, **kwargs):
        if self.redirect_to:
            return HttpResponseRedirect(self.redirect_to.url)

        return super().serve(request, *args, **kwargs)

    def get_menu_url(self):
        """
        Если есть редирект,
        показываеем урл со слагом, который разрулит жабасрипт
        3 это магический номер - 1 root, 2 главная, 3 индексы, 4 статьи и прочее
        """
        result = self.url
        if self.redirect_to_id:
            fragment = f"#!tab={self.slug}" if self.depth > 3 else ""
            result = f"{self.redirect_to.url}{fragment}"

        return result

    def get_title(self):
        return self.seo_title or self.title

    def get_banner(self):
        return self.banner

    def get_annotation(self):
        return getattr(self, "annotation", "") or self.search_description

    def get_menu_title(self):
        return self.menu_title or self.title

    @cached_property
    def get_breadcrumbs(self):
        return list(self.get_ancestors(inclusive=True).specific())

    @property
    def near_parent(self):
        return self.get_breadcrumbs[-2]

    @property
    def far_parent(self):
        return self.get_breadcrumbs[2]

    @property
    def modelname(self):
        return self.__class__.__name__.lower()


# Разводящие страницы
class IndexPage(BasePage):
    is_index = True

    hero = StreamField(
        verbose_name="Перед",
        block_types=ContentStreamBlock,
        blank=True, help_text="Выводится перед основным контентом",
    )

    villain = StreamField(
        verbose_name="После",
        block_types=ContentStreamBlock,
        blank=True, help_text="Выводится после основного контента",
    )

    content_panels = (
        BasePage.content_panels
        + [
            MultiFieldPanel(
                [
                    StreamFieldPanel("hero"),
                    StreamFieldPanel("villain"),
                ],
                classname="collapsible collapsed",
                heading="Дополнительный контент для дочерних страниц",
            ),
        ]
    )

    class Meta:
        abstract = True

    @property
    def elevator_template(self):
        return select_template([
            f"components/elevator/{self.slug}.html",
            "components/elevator/default.html",
        ])


class IndexSitePage(FoyerPageMixin, IndexPage):
    parent_page_types = [Page]
    template = "pages/index.html"

    class Meta:
        verbose_name = "Главная"


class IndexFoyerPage(FoyerPageMixin, IndexPage):
    parent_page_types = ["IndexSitePage", "IndexFoyerPage"]

    class Meta:
        verbose_name = "Фойе"


class IndexShowroomPage(ShowroomPageMixin, IndexPage):
    parent_page_types = ["IndexSitePage", "IndexShowroomPage"]

    class Meta:
        verbose_name = "Музей"


class IndexViewingHallPage(ViewingHallPageMixin, IndexPage):
    parent_page_types = ["IndexSitePage", "IndexViewingHallPage"]

    class Meta:
        verbose_name = "Просмотровый зал"


class IndexGalleryPage(GalleryPageMixin, IndexPage):
    parent_page_types = ["IndexSitePage", "IndexGalleryPage"]

    class Meta:
        verbose_name = "Галерея"


class IndexArchivePage(ArchivePageMixin, IndexPage):
    parent_page_types = ["IndexSitePage", "IndexArchivePage"]

    class Meta:
        verbose_name = "Архив"


class IndexCafeteriaPage(CafeteriaPageMixin, IndexPage):
    parent_page_types = ["IndexSitePage", "IndexCafeteriaPage"]

    class Meta:
        verbose_name = "Кафетерий"


# Концевые страницы
class ContentPage(BasePage):
    banner = models.ForeignKey(
        "wagtailimages.Image", on_delete=models.SET_NULL, related_name="+",
        verbose_name="Баннер",
        null=True, blank=True,
        help_text="Также используется как изображение для шаринга страницы в соцсетях",
    )

    annotation_image = models.ForeignKey(
        "wagtailimages.Image", on_delete=models.SET_NULL, related_name='+',
        verbose_name="Изображение для краткого описания",
        blank=True, null=True,
        help_text="",
    )

    hero = StreamField(
        verbose_name="Перед",
        block_types=ContentStreamBlock,
        blank=True, help_text="Выводится перед основным контентом",
    )

    content = StreamField(
        verbose_name="Содержание",
        block_types=ContentStreamBlock,
        blank=True,
    )

    villain = StreamField(
        verbose_name="После",
        block_types=ContentStreamBlock,
        blank=True, help_text="Выводится после основного контента",
    )

    content_panels = (
        BasePage.content_panels[:3]
        + [ImageChooserPanel("annotation_image")]
        + BasePage.content_panels[3:]
        + [
            MultiFieldPanel(
                [
                    StreamFieldPanel("hero"),
                    StreamFieldPanel("villain"),
                ],
                classname="collapsible collapsed",
                heading="Дополнительный контент",
            ),
        ]
    )

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Простая"


# Музей
class PublicationPage(ShowroomPageMixin, ContentPage):
    """
    Пресса
    """
    parent_page_types = ["IndexShowroomPage"]
    html_class_detail = "publications"

    class Meta:
        verbose_name = "Пресса"
        verbose_name_plural = "Пресса"


class ArtifactPage(ShowroomPageMixin, ContentPage):
    """
    Экспонаты
    Это про оборудование, там сложнее вёрстка
    Мб должно быть связано со снипетом, а может просто иметь специальный блок
    Мб нужно поле для модели на
    """
    parent_page_types = ["IndexShowroomPage"]
    html_class_detail = "models"

    photo = models.ForeignKey(
        "wagtailimages.Image", on_delete=models.SET_NULL, related_name="+",
        verbose_name="Фото без фона",
        null=True, blank=True,
    )

    content_panels = (
        ContentPage.content_panels
        + [
            ImageChooserPanel("photo"),
        ]
    )

    class Meta:
        verbose_name = "Экспонат"
        verbose_name_plural = "Экспонаты"


# Просмотровый зал
class DiafilmPage(ViewingHallPageMixin, ContentPage):
    """
    Диафильмы
    должна быть привязана к снипету диафильма
    """
    parent_page_types = ["IndexViewingHallPage"]
    html_class_detail = "diafilm"

    diafilm = models.OneToOneField(
        "core.Diafilm", on_delete=models.SET_NULL, related_name="page",
        verbose_name="Диафильм", blank=True, null=True,
        help_text="",
    )

    title_image = models.ForeignKey(
        "wagtailsvg.Svg", on_delete=models.SET_NULL, related_name='+',
        null=True, blank=True,
        verbose_name="Название картинкой",
    )

    content_panels = (
        [
            InstanceSelectorPanel("diafilm"),
            SvgChooserPanel("title_image"),
        ]
        + ContentPage.content_panels
    )

    class Meta:
        verbose_name = "Диафильм"
        verbose_name_plural = "Диафильмы"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def as_json_card(self):
        image = None
        if self.annotation_image:
            image = {
                "width": 384,
                "height": 288,
                "x1": self.annotation_image.get_rendition('fill-384x288').url,
                "x2": self.annotation_image.get_rendition('fill-768x576').url,
            }

        return {
            "image": image,
            "label": self.title,
            "year": self.diafilm.issued_at,
            "age": "4+",
            "params": [
                {
                    "label": x.role,
                    "value": x.person.full_name,
                }
                for x in self.diafilm.roles.all().select_related("person")
            ],
            "url": self.url,
        }


class DiafilmCollection(Orderable):
    diafilm = ParentalKey(
        "core.DiafilmPage", on_delete=models.CASCADE,
        related_name="collections",
        verbose_name="Диафильм",
    )

    collection = ParentalKey(
        "core.CollectionPage", on_delete=models.CASCADE,
        related_name="diafilms",
        verbose_name="Подборки",
    )

    content = StreamField(
        BaseStreamBlock,
        verbose_name="Описание",
        blank=True, null=True,
    )

    panels = [
        PageChooserPanel("diafilm"),
        FieldPanel("content"),
    ]

    class Meta:
        verbose_name = "Диафильм - Подборка"
        verbose_name_plural = "Диафильмы и подборки"
        unique_together = ("diafilm", "collection")
        ordering = ("-sort_order", )


class CollectionPage(ViewingHallPageMixin, ContentPage):
    """
    Коллекции диафильмов
    По сути смесь блоков диафильмов с текстовым описанием
    """
    parent_page_types = ["IndexViewingHallPage"]
    html_class_detail = "collections"

    description = models.TextField(verbose_name="Описание", )

    content_panels = (
        ContentPage.content_panels
        + [InlinePanel("diafilms")]
        + [FieldPanel("description")]
    )

    def get_diafilms(self, exclude=None):
        """
        Полный список диафильмов в коллекции
        И привязанные через админку
        И упомянутые в контенте
        """
        diafilms_from_content = [
            x.value["page"]
            for x in self.content
            if x.block_type == "diafilm_link"
        ]

        qs = DiafilmPage.objects.live().public()
        qs = qs.filter(collections__collection_id=self.pk)
        # qs = qs.filter(
        #     models.Q(pk__in=diafilms_from_content)
        #     | models.Q(collections__collection_id=self.pk)
        # )
        if exclude:
            qs = qs.exclude(pk=exclude)

        from itertools import chain
        return chain(diafilms_from_content, qs.iterator())

    class Meta:
        verbose_name = "Коллекция диафильмов"
        verbose_name_plural = "Коллекции диафильмов"


# Галерея
class ArtistPage(GalleryPageMixin, ContentPage):
    """
    Галерея
    Страница человека
    должна быть привязана к снипету человека
    """
    parent_page_types = ["IndexGalleryPage"]
    html_class_detail = "artists"

    person = models.OneToOneField(
        "core.Person", on_delete=models.SET_NULL, related_name="+",
        verbose_name="Диафильм", blank=True, null=True,
        help_text="",
    )

    photo = models.ForeignKey(
        "wagtailimages.Image", on_delete=models.SET_NULL, related_name="+",
        verbose_name="Фотография",
        null=True, blank=True,
    )
    sample = models.ForeignKey(
        "wagtailimages.Image", on_delete=models.SET_NULL, related_name="+",
        verbose_name="Пример работы",
        null=True, blank=True,
    )

    content_panels = (
        [InstanceSelectorPanel("person")]
        + ContentPage.content_panels
        + [
            ImageChooserPanel("photo"),
            ImageChooserPanel("sample"),
        ]
    )

    class Meta:
        verbose_name = "Художник"
        verbose_name_plural = "Художники"


# Архив
class ArticlePage(ArchivePageMixin, ContentPage):
    """
    Статьи по рубрикам
    """
    parent_page_types = ["IndexArchivePage"]
    html_class_detail = "publications"

    class Meta:
        verbose_name = "Статья"
        verbose_name_plural = "Статьи"

    def save(self, clean=True, user=None, log_action=False, **kwargs):
        super().save(clean, user, log_action, **kwargs)


# Кафетерий
class NewsPage(CafeteriaPageMixin, ContentPage):
    """
    Новости по рубрикам
    """
    parent_page_types = ["IndexCafeteriaPage"]
    html_class_detail = "news"

    KIND_NORMAL = "normal"
    KIND_HIGHLIGHTED = "highlighted"
    KIND_CHOICES = (
        (KIND_NORMAL, "Обычная"),
        (KIND_HIGHLIGHTED, "Выделенная"),
    )
    KIND_DEFAULT = KIND_NORMAL

    CATEGORY_ZEN = "zen"
    CATEGORY_EVENTS = "events"
    CATEGORY_PRO = "pro"
    CATEGORY_CHOICES = (
        (CATEGORY_ZEN, "Яндекс.Дзен"),
        (CATEGORY_EVENTS, "События"),
        (CATEGORY_PRO, "Специалистам"),
    )
    CATEGORY_DEFAULT = CATEGORY_ZEN

    published_at = models.DateField(
        verbose_name="Дата и время публикации",
        default=timezone.now,
    )

    kind = models.CharField(
        verbose_name="Тип",
        max_length=255,
        choices=KIND_CHOICES,
        default=KIND_DEFAULT,
    )

    category = models.CharField(
        verbose_name="Категория",
        max_length=255,
        choices=CATEGORY_CHOICES,
        default=CATEGORY_DEFAULT,
    )

    content_panels = ContentPage.content_panels[:4] + [
        FieldPanel("category"),
        FieldPanel("kind"),
        FieldPanel("published_at"),
    ] + ContentPage.content_panels[4:]

    class Meta:
        verbose_name = "Новость"
        verbose_name_plural = "Новости"

    @property
    def is_highlighted(self):
        return self.kind == NewsPage.KIND_HIGHLIGHTED

    def get_context(self, request, *args, **kwargs):
        return super().get_context(request, *args, **kwargs)

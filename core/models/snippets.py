from django.core.cache import cache
from django.db import models
from django.utils import timezone
from wagtail.admin.edit_handlers import (FieldPanel, FieldRowPanel,
                                         PageChooserPanel)
from wagtail.core.fields import StreamField
from wagtail.images.edit_handlers import ImageChooserPanel
from wagtail.snippets.models import register_snippet

from core.blocks import RawStreamBlock


@register_snippet
class Chunk(models.Model):
    slug = models.SlugField(
        help_text="Строка, по которой данный chunk можно использовать в шаблоне",
    )
    description = models.TextField(
        help_text="Описание для администратора, где отображается и так далее",
        blank=True,
    )

    content = StreamField(
        verbose_name="Содержание",
        block_types=RawStreamBlock,
        blank=True, null=True,
    )

    panels = [
        FieldPanel("slug"),
        FieldPanel("description"),
        FieldPanel("content"),
    ]

    def __str__(self):
        return f"Вставка {self.slug}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        from core.templatetags.chunk_tags import get_chunk
        cache.delete(get_chunk.cache_key)

    class Meta:
        verbose_name = "вставка"
        verbose_name_plural = "вставки"


@register_snippet
class Quote(models.Model):
    author = models.CharField(verbose_name="Автор", max_length=100)
    image = models.ForeignKey(
        'wagtailimages.Image', related_name='+', on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Изображение",
    )
    caption = models.CharField(verbose_name="Подпись", max_length=100)
    text = models.TextField(verbose_name="Текст")
    # source = models.CharField(verbose_name="Источник", max_length=50)

    panels = [
        FieldPanel("author"),
        ImageChooserPanel("image"),
        FieldPanel("caption"),
        FieldPanel("text"),
    ]

    def __str__(self):
        return f"«{self.text}» {self.author}, {self.caption}"

    class Meta:
        verbose_name = "цитата"
        verbose_name_plural = "цитаты"


class Day(models.Model):
    """
    Для рубрики Диафильм дня
    """
    day = models.IntegerField(verbose_name="День")
    month = models.IntegerField(verbose_name="Месяц")
    description = models.CharField(
        max_length=255, verbose_name="Описание",
        blank=True, null=True,
    )
    diafilm_page = models.ForeignKey(
        "core.DiafilmPage", related_name="day", on_delete=models.CASCADE,
        verbose_name="Страница диафильма",
    )

    panels = (
        FieldRowPanel([
            FieldPanel("day"),
            FieldPanel("month"),
        ]),
        FieldPanel("description", classname="full"),
        PageChooserPanel("diafilm_page"),
    )

    class Meta:
        verbose_name = "Диафильм дня"
        verbose_name_plural = "Диафильмы дня"
        unique_together = ("day", "month", "diafilm_page", "description")
        ordering = ("month", "day")

    def __str__(self):
        return f"{self.diafilm_page_id}@{self.day}.{self.month}"

    def admin_title(self):
        return f"{self.day:02}.{self.month:02}"

    def next_date(self):
        today = timezone.now()
        result = today.replace(day=self.day, month=self.month)
        if result < today:
            result = result.replace(year=result.year + 1)

        return result

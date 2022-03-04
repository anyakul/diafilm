"""

Диафильм дня
Документ
...


"""
from django.db import models

from wagtail_pointsblock.blocks import PointsStreamBlock


class Document(models.Model):
    """

    """
    pass


class Day(models.Model):
    """
    Для задания диафильма дня
    Год значения не имеет, будем выбирать экстрактом наверное
    Ну и получается один диафильм может к нескольким дня быть привязан
    """
    day = models.DateField(verbose_name="День и месяц", db_index=True)
    diafilm = models.ForeignKey(
        "Diafilm", related_name="day", on_delete=models.CASCADE,
        verbose_name="Диафильм", db_index=True,
    )
    description = models.TextField(
        verbose_name="Описание",
        help_text="Почему этот диафильм привязан к этому дню",
    )

    class Meta:
        verbose_name = "День"
        verbose_name_plural = "Дни"
        unique_together = ("day", "diafilm")
        ordering = ("day", )

# Generated by Django 3.2.9 on 2021-12-31 09:11

import django.db.models.deletion
import modelcluster.fields
import wagtail.core.blocks
import wagtail.core.fields
import wagtail.documents.blocks
import wagtail.images.blocks
from django.db import migrations

import core.blocks.content
import core.blocks.media
import core.blocks.specific
import core.blocks.text


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_auto_20211231_0231'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='chunk',
            name='body',
        ),
        migrations.AddField(
            model_name='chunk',
            name='content',
            field=wagtail.core.fields.StreamField([('text_rich', core.blocks.text.BaseRichTextBlock()), ('raw', core.blocks.media.RawBlock())], blank=True, null=True, verbose_name='Содержание'),
        ),
    ]
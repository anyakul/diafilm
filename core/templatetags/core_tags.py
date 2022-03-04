import importlib
import random

from django import template
from django.db.models.query import QuerySet
from django.template.defaultfilters import slugify, stringfilter
from django.utils.safestring import mark_safe
from wagtail.images.templatetags import wagtailimages_tags
from wagtail.images.templatetags.wagtailimages_tags import ImageNode, image
from wagtail_typograf.handlers import Typograf

register = template.Library()


@register.filter(is_safe=True)
@stringfilter
def format_title(text):
    result = Typograf(text).process()
    return mark_safe(result)


@register.filter(is_safe=True)
@stringfilter
def ft(text):
    return format_title(text)


class CustomImageNode(ImageNode):
    def render(self, context):
        try:
            self.filter_spec = template.Variable(self.filter_spec).resolve(context)
        except template.VariableDoesNotExist:
            pass

        return super().render(context)


# to use image tag with core_tags
image = register.tag(name="image")(image)
# to avoid full copy of image tag
# dirty hack to resolve filter_ops from variable in template
wagtailimages_tags.ImageNode = CustomImageNode

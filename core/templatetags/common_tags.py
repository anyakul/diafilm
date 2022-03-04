import itertools
import re
from operator import floordiv, mul

from django import template
from django.template import Library
from django.template.defaultfilters import stringfilter
from django.utils.safestring import mark_safe
from wagtail.core.models import Page
from wagtail.images.templatetags import wagtailimages_tags
from wagtail.images.templatetags.wagtailimages_tags import ImageNode, image
from wagtail_typograf.handlers import Typograf

from core.models import Chunk

register = Library()


@register.filter
def phone_raw(phone):
    phone = re.sub("[^+\d]", "", phone)
    return phone


@register.filter(is_safe=True)
@stringfilter
def format_title(text):
    return Typograf(text).process()


@register.filter(is_safe=True)
@stringfilter
def ft(text):
    return format_title(text)


@register.simple_tag()
def split(text, separator=","):
    result = text.split(separator)
    return result


@register.filter
def chunks(value, length):
    """
    Breaks a list up
    into a list of lists
    of size <chunk_length>
    """
    length = int(length)
    iterator = iter(value)
    while True:
        chunk = list(itertools.islice(iterator, length))
        if chunk:
            yield chunk
        else:
            break


@register.simple_tag(takes_context=True)
def get_images(context):
    # default context with format=jpeg
    ctx = {"format": context.get("format", "jpeg")}
    ctx.update(context.dicts[-1])

    img = context.get("img")
    sizes = get_sizes(context)
    attrs = get_data_attrs(ctx)
    result = {"attrs": attrs}

    specs = ctx.get("filters", "").split()
    for key, value in ctx.items():
        if key == "format":
            specs.append(f"format-{value}")

    from wagtail.images.models import Filter
    from wagtail.images.shortcuts import get_rendition_or_not_found
    for key, value in sizes.items():
        specs.append(value)
        result[key] = img and value and get_rendition_or_not_found(
            img,
            Filter(spec="|".join(specs)),
        )

        specs.pop()

    return result


@register.simple_tag(takes_context=True)
def get_sizes(context):
    value = context.get("size", "")
    value = value or context.get("normal")
    parts = value.split("-")
    func = parts.pop(0)
    size = parts.pop(0)

    size = [int(x) for x in size.split("x")]
    size = [[f(x) for x in size] for f in get_sizes.funcs]
    size = [[str(x) for x in l] for l in size]
    # XXxYY
    size = ["x".join(x) for x in size]
    # Если есть явно указанный размер, то берем его
    # если нет, то формируем size-XXxYY
    size = {
        x: context.get(x, f"{func}-{size[i]}")
        for i, x in enumerate(("small", "normal", "large"))
    }
    return size


get_sizes.funcs = [
    lambda x: floordiv(x, 2),
    lambda x: x,
    lambda x: mul(x, 2),
]


@register.simple_tag(takes_context=True)
def get_data_attrs(context):
    return [
        (k.replace("_", "-", 1), v)
        for k, v in context.items()
        if k.startswith("data_")
    ]


@register.simple_tag
def include_tmpl(*args, **kwargs):
    has_with = False
    has_only = False
    templates = []
    for item in args:
        if item == "with":
            has_with = True
        elif item == "only":
            has_only = True
        else:
            templates.append(item)

    from django.template.loader_tags import IncludeNode
    return IncludeNode(templates, extra_context=kwargs, isolated_context=has_only)


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

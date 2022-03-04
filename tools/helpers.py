from uuid import uuid4

from django.utils.text import slugify
from unidecode import unidecode
from wagtail.core.blocks import StreamBlock, StreamValue, StructValue


def block(block_cls, block_name, **kwargs):
    block_obj = block_cls()
    value_cls = getattr(block_obj.meta, "value_class", None)

    if value_cls is None:
        result = None
    elif issubclass(value_cls, StructValue):
        result = []
        for key, value in kwargs.items():
            cls = block_obj.child_blocks.get(key)

            if isinstance(cls, StreamBlock):
                value = stream(
                    cls,
                    value
                )

            result.append((key, value))

        # value = StructValue(
        #     block_name,
        #     [(k, v) for k, v in kwargs.items()],
        # )

        result = StructValue(block_name, result)
    elif issubclass(value_cls, StreamValue):
        # StructValue()
        result = StreamValue.StreamChild(
            id=None,
            block=block_cls(),
            value=kwargs,
        )
    else:
        result = None

    return block_name, result


def stream(obj, content):
    # if name:
    #     obj = obj.child_blocks[name]

    return StreamValue(obj, content)


def make_slug(value, max_length=50):
    """ Транслитерует value и приводит его к виду слага

    Пример:
    'Александр Сергеевич Пушкин' -> 'aleksandr-sergeevich-pushkin'
    """
    value = unidecode(value)
    value = slugify(value)[:max_length]
    return value

from django.core.cache import cache
from django.template import Library

from core.models import Chunk

register = Library()


@register.simple_tag(takes_context=True)
def get_chunk(context, slug, default=""):
    """
    cache all chunks in one request
    and return chunk by slug
    """
    chunks = cache.get(get_chunk.cache_key)
    if chunks is None:
        qs = Chunk.objects.all()
        chunks = {x.slug: [b.render_as_block() for b in x.content] for x in qs}
        cache.set(get_chunk.cache_key, chunks)

    return chunks.get(slug, default)


get_chunk.cache_key = "chunks"


@register.simple_tag
def get_chunk_list(names=None):
    """
    returns list of chunks with passed comma separated slugs
    """
    # default names
    names = (
        [x.strip() for x in names.split(",")]
        if names else
        ("facebook", "instagram", "vkontakte")
    )

    data = [(x, get_chunk(context=None, slug=x)) for x in names]
    return data

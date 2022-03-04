from .models import *
from .pages import *
from .snippets import *

CONTENT_PAGES = {
    x.__name__: x
    for x in ContentPage.__subclasses__()
}


CONTENT_PAGES_CHOICES = [
    (k, getattr(v._meta, "verbose_name_plural", v.__name__))
    for k, v in CONTENT_PAGES.items()
]

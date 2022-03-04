from django.template import Library
from wagtail.core.models import Page, Site

register = Library()


@register.simple_tag()
def get_menus():
    """
    Идея в том, чтобы взять отсортированные по пути
    индексные страницы выше 4 уровня
    и составить из них дерево на атрибутах
    """
    qs = Page.objects.live().public()
    qs = qs.filter(depth__lte=4)
    qs = qs.select_related('content_type').specific()
    qs = qs.order_by("path")

    from core.models import IndexPage, IndexSitePage
    parent = None
    root = None
    by_slug = {}
    for page in qs.iterator():
        if not isinstance(page, IndexPage):
            continue

        by_slug[page.slug] = page

        if not root:
            root = page

        page.menu_children = []
        page.menu_parent = parent

        if parent is None or page.depth > parent.depth:
            if parent:
                parent.menu_children.append(page)

            parent = page
            continue

        while page.depth <= parent.depth:
            parent = parent.menu_parent

        page.menu_parent = parent
        parent.menu_children.append(page)
        parent = page

    root.by_slug = by_slug
    return root


def get_section(page, depth):
    if not page:
        return
    if page.depth > depth:
        return page.get_ancestors().live().filter(depth=depth).first()
    if page.depth == depth:
        return page


@register.simple_tag(takes_context=True)
def get_menu(context, page=None, depth=2):
    if not page:
        page = Site.find_for_request(context['request']).root_page
        context['self'] = page
    elif isinstance(page, str):
        page = Page.objects.live().public().filter(slug=page)
        # page = page.filter(locale=get_locale())
        page = page.first()

    section = get_section(page, depth)
    if not section:
        return dict()

    # items = section.localized.get_children().live().in_menu().specific()
    items = section.get_children().live().in_menu().specific()
    return items


@register.inclusion_tag("tags/breadcrumbs.html", takes_context=True)
def breadcrumbs(context):
    self = context.get("self")
    if self is None or self.depth <= 2:
        # When on the core page, displaying breadcrumbs is irrelevant.
        qs = ()
    else:
        qs = Page.objects.ancestor_of(self, inclusive=True)
        qs = qs.filter(depth__gt=1)
    return {
        "ancestors": qs,
        "request": context["request"],
    }


@register.simple_tag(takes_context=True)
def get_back_url(context, url=None, tab=None, **kwargs):
    """
    Если в реферере наш домен и путь до текущей страницы,
    то можно его использовать в качестве возвратного

    Фрагмент не прокидывается,
    Так что его придётся формировать руками
    """
    request = context.get("request")
    referer = request and request.headers.get("referer")

    from urllib import parse
    referer_obj = referer and parse.urlparse(referer) or None
    referer_ok = (
        referer_obj
        and request.get_host() == referer_obj.netloc
        and (referer_obj.path == url if url else True)
    )
    if referer_ok:
        url = referer

    if tab:
        url = f"{url}#!tab={tab}"

    return url

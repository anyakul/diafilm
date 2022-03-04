from datetime import datetime
from math import ceil
from random import randint

from django import forms, template
from django.core.paginator import Paginator
from django.db.models import Count
from django.template.loader import select_template
from django.utils import timezone
from wagtail.core.query import PageQuerySet
from wagtail.images.models import Image

from core.models import (ArtifactPage, ArtistPage, Day, Diafilm, DiafilmPage,
                         NewsPage, Person, PublicationPage, Quote)
from core.views import (ArtistListView, CollectionListView, DiafilmListView,
                        NewsListView)

register = template.Library()


def get_by_qs(qs, count=None, ordering=None):
    if ordering is not None and qs.count() > 1:
        ordering = (ordering, ) if isinstance(ordering, str) else ordering
        if "?" in ordering:
            # Рандомизируем по списку id
            qs = qs.model.objects.filter(
                pk__in=qs.values_list("pk", flat=True),
            )

        qs = qs.order_by(*ordering)

    if isinstance(qs, PageQuerySet):
        qs = qs.live().public().specific()

    if count:
        object_list = list(qs[:count])
    else:
        object_list = qs.iterator()

    return object_list


@register.simple_tag
def get_collection(name, count=None, ordering=None):
    qs = Image.objects.filter(collection__name=name)
    return get_by_qs(qs, count, ordering)


@register.simple_tag
def get_related_diafilms(person, count=10, ordering=None):
    qs = DiafilmPage.objects.filter(diafilm__persons=person)
    qs = qs
    return get_by_qs(qs, count, ordering)


@register.simple_tag
def get_equipment_similar(instance, count=None, ordering=None):
    qs = ArtifactPage.objects.live().public()
    if isinstance(instance, ArtifactPage):
        qs = qs.exclude(pk=instance)

    return get_by_qs(qs, count, "?")


@register.simple_tag
def get_publication_similar(instance, parent=None, count=30, ordering=None,
                            **kwargs):
    """
    Похожие публикации
    """
    if parent:
        qs = parent.get_children()
    else:
        qs = PublicationPage.objects

    if isinstance(instance, qs.model):
        qs = qs.exclude(pk=instance.pk)

    object_list, sample = [], None

    ordering = ordering or "?"
    qs = get_by_qs(qs, count, ordering)
    for item in qs:
        if not sample:
            html_class = getattr(item, "html_class", None)
            if not html_class:
                continue

            sample = item

        if not isinstance(item, sample.__class__):
            continue

        object_list.append(item)

    return {
        "object_list": object_list,
        "html_class": sample.html_class,
        "class": getattr(sample, "html_class_detail", "default"),
        "template": select_template([
            f"components/similar/detail_{sample.modelname}.html",
            "components/similar/detail_default.html",
        ])
    }


@register.simple_tag
def get_diafilm_related(instance, count=None, ordering=None):
    """
    Связанные по людям диафильмы,
    но, оказывается, все люди нам не подходят
    """
    qs = DiafilmPage.objects
    if isinstance(instance, DiafilmPage):
        qs = qs.exclude(pk=instance)
        persons_qs = instance.diafilm.roles.filter(role__in=Person.ROLES_IMPORTANT)
        persons_qs = persons_qs.values_list("person_id", flat=True)
        qs = qs.filter(diafilm__roles__person_id__in=persons_qs)
    elif isinstance(instance, ArtistPage):
        qs = qs.filter(diafilm__roles__person=instance.person)

    return get_by_qs(qs, count, "?")


@register.simple_tag
def get_diafilms_from_collection(collection, exclude=None):
    return collection.get_diafilms(exclude)


@register.simple_tag
def get_quotes(count=10, ordering="?"):
    """
    Берёт цитаты
    """
    qs = Quote.objects.all()
    return get_by_qs(qs, count, ordering)


@register.simple_tag
def get_news_categories(category=None):
    categories = NewsPage.CATEGORY_CHOICES
    return {
        "object_list": categories,
        "active": (
            category
            if any(1 for x in categories if x[0] == category) else
            "all"
        ),
    }


@register.simple_tag(takes_context=True)
def get_news_pages(context, count=9):
    view_func = NewsListView.as_view()
    view_func.view_class.paginate_by = (
        count
        if count else
        view_func.view_class.paginate_by_default
    )

    response = view_func(context["request"])
    return response.context_data["page_obj"]


@register.simple_tag
def get_child_news_pages(parent, active_slug=None):
    qs = NewsPage.objects.live().public()
    qs = qs.child_of(parent)

    pages, page = [], None
    for item in qs.iterator():
        pages.append(item)
        if active_slug and item.slug == active_slug:
            page = item

    return {
        "object_list": pages,
        "active_page": page,
    }


@register.simple_tag
def get_child_pages(parent):
    qs = parent._meta.model.objects.live().public()
    qs = qs.child_of(parent)
    return qs


@register.simple_tag
def get_artists(roles=None):
    qs = Person.objects.all()
    if roles:
        qs = qs.filter(roles__role__in=roles)

    qs = qs.annotate(diafilms_count=Count("roles"))
    qs = qs.exclude(diafilms_count__lte=1)

    return get_by_qs(qs, count=50, ordering=("-diafilms_count", "full_name"))


@register.simple_tag(takes_context=True)
def get_artist_pages(context, count=None, ordering=None):
    view_func = ArtistListView.as_view()
    view_func.view_class.paginate_by = (
        count
        if count else
        view_func.view_class.paginate_by_default
    )

    if ordering:
        view_func.ordering = [
            x.strip()
            for x in ordering.split(",")
        ]

    response = view_func(context["request"])
    return response.context_data["page_obj"]


class DiafilmFilterForm(forms.Form):
    query = forms.CharField(required=False)
    person = forms.CharField(required=False)


@register.simple_tag(takes_context=True)
def get_diafilm_pages(context, count=None, ordering=None):
    view_func = DiafilmListView.as_view()
    view_func.view_class.paginate_by = (
        count
        if count else
        view_func.view_class.paginate_by_default
    )

    response = view_func(context["request"])
    result = response.context_data["page_obj"]
    if ordering == "?":
        page_range = response.context_data["page_obj"].paginator.page_range
        page = randint(
            page_range.start,
            ceil(
                page_range.stop
                * view_func.view_class.paginate_by
                / view_func.view_class.paginate_by_default
            ),
        )
        result = result.paginator.get_page(page)

    return result


@register.simple_tag(takes_context=True)
def get_diafilm_school_pages(context, count=10):
    from django.test import RequestFactory
    fake_request = RequestFactory().get("", {"is_school": True})
    return get_diafilm_pages({"request": fake_request}, count, ordering="?")


@register.simple_tag
def get_diafilm_of_the_day(date=None):
    date = datetime.fromisoformat(date) if date else timezone.now()
    qs = Day.objects.filter(day=date.day, month=date.month)
    day = qs.order_by("?").first()

    result = None
    if day:
        result = day

    return result


@register.simple_tag(takes_context=True)
def get_collection_pages(context):
    view_func = CollectionListView.as_view()
    response = view_func(context["request"])
    return response.context_data["page_obj"]


@register.simple_tag
def get_collection_images(collection_id, count=None, ordering=None):
    qs = Image.objects.filter(collection_id=collection_id)
    return get_by_qs(qs, count, ordering)


@register.filter
def person_filter(value):
    def get_aliases(value):
        parts = value.split(" ")
        ln = parts.pop(0)
        fn = parts.pop(0) if parts else ""
        mn = parts.pop(0) if parts else ""
        return [f"{ln} {fn[:1]}{mn[:1]}", f"{ln} {fn[:1]}"]

    aliases = {}
    result = []
    for item in value:
        name = item.value.bound_blocks["name"].value
        if name in Person.ROLES_SKIP:
            continue

        value = item.value.bound_blocks["value"].value
        item_aliases = {x: item for x in get_aliases(value)}
        for alias in item_aliases:
            item_alias = aliases.get(alias)
            alias_value = item_alias and item_alias.value.bound_blocks["value"].value
            if alias_value and len(alias_value) > len(value):
                break
            else:
                aliases[alias] = item

        result.append(item)

    return tuple(set(aliases.values()))


@register.simple_tag
def get_school_subjects():
    qs = Diafilm.objects.all()
    qs = qs.exclude(doc__schoolsubj=None)
    qs = qs.values_list("doc__schoolsubj", flat=True)
    qs = qs.distinct()
    qs = qs.order_by("doc__schoolsubj")
    # qs = qs.order_by("title")

    # object_list, subjects = [], set()
    # for item in qs.iterator():
    #     subjects.add(item.school_subject)
    #     object_list.append(item)

    # return {
    #     "subjects": list(subjects),
    #     "object_list": object_list,
    # }

    return list(qs)


@register.simple_tag
def get_school_level_list():
    qs = Diafilm.objects.all()
    qs = qs.exclude(doc__schoollevel=None)
    qs = qs.values_list("doc__schoollevel", flat=True)

    from collections import defaultdict
    result, total = defaultdict(int), 0
    for level in qs:
        result[level] += 1
        total += 1

    return {
        "object_list": sorted(result.items()),
        "total": total,
    }

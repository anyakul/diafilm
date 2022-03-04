import json
import logging

import requests
from django import forms
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.core.mail import mail_managers
from django.db.models import Count
from django.forms import EmailField
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.generic import FormView, ListView
from django.views.generic.edit import BaseFormView, CreateView, UpdateView
from django_filters import (BooleanFilter, CharFilter, ChoiceFilter, FilterSet,
                            NumberFilter)
from django_filters.views import FilterView
from wagtail.contrib.modeladmin.views import ModelFormView

from core.models import (ArtistPage, CollectionPage, Diafilm, DiafilmPage,
                         Location, NewsPage, Subscription)
from etl.diafilm import ApiDiafilm

logger = logging.getLogger(__name__)


class SuperUserRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser


class ImportForm(forms.Form):
    """
    Можно сюда накопировать хэндлы построчно
    и мы их все создадим/обновим через апишку РГДБ
    """
    handles = forms.CharField(
        label="Хэндлы",
        widget=forms.Textarea(attrs={"rows": 6}),
    )

    def is_valid(self):
        if super().is_valid():
            self.save()

    def request(self, handle_id):
        data = None
        url = f"https://arch.rgdb.ru/rest/items/{handle_id}/metadata"

        try:
            response = requests.get(url)
        except Exception as exc:
            pass
        else:
            if response.status_code != 404:
                data = response.json()

        return data

    def save_object(self, handle_id, data):
        try:
            obj = ApiDiafilm.from_json(
                doc_id=handle_id,
                data=data,
            )
            obj = Diafilm.from_api(obj)
            Diafilm.objects.update_or_create(
                eid=obj["eid"],
                defaults=obj,
            )
        except Exception as exc:
            logger.error(
                "Import failed: %s (%s, %s)",
                exc, handle_id, data,
                exc_info=True,
            )

    def save(self):
        """
        По каждому надо сделать запрос
        https://arch.rgdb.ru/rest/items/36365/metadata

        Если что, кинем в арк, там совсем асинк
        """
        handles = self.cleaned_data.get("handles", "").split()
        for handle_id in handles:
            data = self.request(handle_id)
            self.save_object(handle_id, data)

        # ASYNC-версия
        # from arq.constants import default_queue_name
        # params = settings.ARQ_QUEUES[default_queue_name]

        # import asyncio
        # from arq import create_pool
        # redis = asyncio.run(create_pool(**params))

        # loop = asyncio.new_event_loop()
        # redis = loop.run_until_complete(create_pool(params))
        # loop.run_until_complete(redis.enqueue_job('fetch_handle_data', handles))


class ImportView(SuperUserRequiredMixin, FormView):
    """
    В проде не будет дампа базы РГДБ
    так что придётся брать большую часть данных из API
    в котором тоже кое-чего может не быть
    """
    template_name = "core/import.html"
    form_class = ImportForm


class JsonForm:
    def form_valid(self, form):
        return JsonResponse({
            "success": True,
            "data": {},
        }, status=200)

    def form_invalid(self, form):
        errors = form.errors
        return JsonResponse({
            "success": False,
            "data": errors,
        }, status=400)


class ContactForm(forms.Form):
    email = forms.EmailField()
    subject = forms.CharField(max_length=100)
    message = forms.CharField(max_length=1000)
    attachment = forms.FileField(required=False)


class ContactView(JsonForm, BaseFormView):
    """
    Обрабатывает данные из формы для обратной связи с фронта
    """
    form_class = ContactForm

    def form_valid(self, form):
        # TODO: rewrite
        mail_managers(
            form.cleaned_data["subject"],
            form.cleaned_data["message"],
            fail_silently=False,
            connection=None,
            html_message=None,
        )

        return super().form_valid(form)

    def get(self, request, *args, **kwargs):
        return HttpResponse("", status=405)


class SubscriptionForm(forms.ModelForm):

    class Meta:
        model = Subscription
        fields = ("email", )

    def save(self, commit=True):
        self.instance.status = Subscription.STATUS_NEW
        return super(SubscriptionForm, self).save(commit)


class SubscriptionView(JsonForm, CreateView):
    form_class = SubscriptionForm


class UnsubscriptionForm(forms.ModelForm):
    class Meta:
        model = Subscription
        fields = ("email", )

    def save(self, commit=True):
        self.instance.status = Subscription.STATUS_REJECTED
        super().save(commit)


class UnsubscriptionView(JsonForm, UpdateView):
    form_class = UnsubscriptionForm


class CustomChoiceFilter(ChoiceFilter):
    def __init__(self, *args, **kwargs):
        self.any_value = kwargs.pop("any_value", None)
        if self.any_value:
            choices = kwargs.get("choices", ())
            kwargs["choices"] = ((self.any_value, "Any"), ) + choices

        super().__init__(*args, **kwargs)

    def filter(self, qs, value):
        if self.any_value and value == self.any_value:
            return qs

        return super().filter(qs, value)


class NewsFilter(FilterSet):
    category = CustomChoiceFilter(choices=NewsPage.CATEGORY_CHOICES, any_value="all")

    def filter_queryset(self, queryset):
        result = super().filter_queryset(queryset)
        return result


class NewsListView(FilterView, ListView):
    template_name = "components/news/list.html"
    queryset = NewsPage.objects.live().public()
    ordering = ("-published_at", "-pk")
    filterset_class = NewsFilter

    paginate_by_default = 3 * 3
    paginate_by = paginate_by_default
    allow_empty = True

    def get_filterset(self, filterset_class):
        fs = super().get_filterset(filterset_class)
        return fs


class DiafilmFilter(FilterSet):
    query = CharFilter(field_name="title", lookup_expr="icontains")
    person = CharFilter(field_name="diafilm__roles__person_id", lookup_expr="exact")

    is_school = BooleanFilter(field_name="diafilm__doc__schoolsubj", method="filter_is_school")
    subject = CharFilter(field_name="diafilm__doc__schoolsubj", lookup_expr="iexact")
    level = CharFilter(field_name="diafilm__doc__schoollevel", lookup_expr="iexact")

    def filter_is_school(self, queryset, name, value):
        return queryset.exclude(**{name: value})

    def filter_queryset(self, queryset):
        result = super().filter_queryset(queryset)
        return result

        if search_query is not None:
            multimatch.append({
                "query": search_query,
                "fields": [
                    "title",
                    # "categories^2",
                    # "description^0.5",
                    # "persons.role^1",
                    # "persons.name^3",
                ],
                "type": "best_fields",
                "operator": "OR",
                "fuzziness": "AUTO",
                "prefix_length": 2,
                "max_expansions": 3,
            })

        subject = ""
        if subject:
            multimatch.append({
                "query": search_query,
                "fields": [
                    "title",
                    # "categories^2",
                    # "description^0.5",
                    # "persons.role^1",
                    # "persons.name^3",
                ],
                "type": "best_fields",
                "operator": "OR",
                "fuzziness": "AUTO",
                "prefix_length": 2,
                "max_expansions": 3,
            })

        query = {
            "bool": {
                "should": [
                    {
                        "multi_match": {
                            "query": search_query,
                            "fields": [
                                "title^3",
                                "categories^2",
                                "description^0.5",
                                "persons.role^1",
                                "persons.name^3",
                            ],
                            "type": "best_fields",
                            "operator": "OR",
                            "fuzziness": "AUTO",
                            "prefix_length": 2,
                            "max_expansions": 3,
                        }
                    },
                    {
                        "multi_match": {
                            "query": search_query,
                            "fields": [
                                "_id",
                                "handle",
                            ]
                        }
                    },
                ]
            }
        }

        es = get_elasticsearch()
        search_results = es.search(
            index=settings.ELASTICSEARCH_INDEX,
            query=query,
            size=per_page,
            from_=per_page * (page - 1),
        )
        total = search_results["hits"]["total"]["value"]

        # search_results = Page.objects.live().search(search_query)
        # query = Query.get(search_query)

        # Record hit
        # query.add_hit()


class DiafilmListView(FilterView, ListView):
    template_name = "components/diafilms/list.html"
    queryset = DiafilmPage.objects.live().public()
    ordering = ("title", )
    filterset_class = DiafilmFilter

    paginate_by_default = 3 * 4
    paginate_by = paginate_by_default
    allow_empty = True

    # def get_filterset(self, filterset_class):
    #     fs = super().get_filterset(filterset_class)
    #     return fs


class CollectionListView(ListView):
    template_name = "components/collections/list.html"
    queryset = CollectionPage.objects.live().public()
    ordering = ("-pk", )

    paginate_by = 4
    page_kwarg = "collection_page"
    allow_empty = True


class ArtistFilter(FilterSet):
    query = CharFilter(field_name="person__full_name", lookup_expr="icontains")


class ArtistListView(FilterView, ListView):
    template_name = "components/artists/list.html"
    queryset = ArtistPage.objects.live().public()
    ordering = ("person__full_name", )
    filterset_class = ArtistFilter

    paginate_by_default = 4 * 3
    paginate_by = paginate_by_default
    allow_empty = True


class GlobeCardFilter(FilterSet):
    pk = NumberFilter(field_name="diafilm__locations__location_id", lookup_expr="exact")


class GlobeCardListView(FilterView, ListView):
    queryset = DiafilmPage.objects.live().public().select_related("diafilm")
    filterset_class = GlobeCardFilter

    def render_to_response(self, context, **response_kwargs):

        return JsonResponse({
            "success": True,
            "items": [
                x.as_json_card()
                for x in context["object_list"]
            ]
        })


class LocationFilter(FilterSet):
    parent = NumberFilter(field_name="tn_parent", lookup_expr="exact")

    def filter_queryset(self, queryset):
        result = super().filter_queryset(queryset)
        return result


class GlobePointListView(FilterView, ListView):
    queryset = Location.objects.all()
    filterset_class = LocationFilter

    def get_queryset(self):
        qs = super().get_queryset()
        # qs = qs.annotate(count=Count("diafilms"))
        qs = qs.exclude(count=0)
        # if not self.request.GET:
        #     qs = qs.filter(tn_parent=None)

        return qs

    def build_tree_from_qs(self, qs):
        items = {}
        result = []

        for item in qs:
            item_data = item.as_json()
            item_data["children"] = []
            items[item.pk] = item_data
            parent = items.get(item.parent_pk)
            if parent:
                parent["children"].append(item_data)
            else:
                result.append(item_data)

        return result

    def render_to_response(self, context, **response_kwargs):
        # super(GlobePointListView, self).render_to_response()
        result = self.build_tree_from_qs(context["object_list"])
        return JsonResponse({
            "success": True,
            "items": result,
        })

import json
from datetime import datetime

from django.conf import settings
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.template.response import TemplateResponse
from elasticsearch import Elasticsearch
from elasticsearch.helpers import scan
from wagtail.core.models import Page
from wagtail.search.models import Query

from core.models import get_elasticsearch


class Diafilm:
    def __init__(self, data):
        self.data = data

    def __getitem__(self, item):
        return self.source[item]

    # def __getattr__(self, item):
    #     return self.source[item]

    @property
    def id(self):
        return self.data["_id"]

    @property
    def source(self):
        return self.data["_source"]

    @property
    def diafilm_of_the_day(self):
        result = self.source["dates"].get("diafilm_of_the_day", None)
        result = result and datetime.fromisoformat(result)
        return result

    def issued_at(self):
        return datetime.fromisoformat(self.source["dates"]["issued"])

    def dlist(self):
        return (
            x["value"]
            for x in self.source["description"]
            if x["type"] != "provenance"
        )

    def as_json(self):
        return json.dumps(self.data, indent=4, ensure_ascii=False)


def search(request):
    per_page = 10
    search_query = request.GET.get("query", "")
    page = int(request.GET.get("page", 1))

    # Search
    if search_query == "":
        es = get_elasticsearch()
        search_results = es.search(
            index=settings.ELASTICSEARCH_INDEX,
            size=per_page,
            from_=per_page * (page - 1),
        )
        total = search_results["hits"]["total"]["value"]
    elif search_query is not None:
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
    else:
        search_results = Page.objects.none()

    # Pagination
    results = [""] * total
    results[(page - 1) * per_page:(page - 1) * per_page + per_page] = [
        Diafilm(x)
        for x in search_results["hits"]["hits"]
    ]
    paginator = Paginator(
        results,
        per_page,
    )
    try:
        results = paginator.page(page)
    except PageNotAnInteger:
        results = paginator.page(1)
    except EmptyPage:
        results = paginator.page(paginator.num_pages)

    siblings = 4
    return TemplateResponse(request, 'search/search.html', {
        'search_query': search_query,
        'search_results': results,
        'page_range': [
            x
            for x in results.paginator.page_range
            if x - siblings < results.number < x + siblings
        ],
    })

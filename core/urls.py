from django.urls import path

from core.views import (ArtistListView, CollectionListView, ContactView,
                        DiafilmListView, GlobeCardListView, GlobePointListView,
                        ImportView, NewsListView, SubscriptionView,
                        UnsubscriptionView)

app_name = "core"


urlpatterns = [
    path("import/", ImportView.as_view(), name="import"),

    path("contact/", ContactView.as_view(), name="contact"),
    path("subscribe/", SubscriptionView.as_view(), name="subscribe"),
    path("unsubscribe/", UnsubscriptionView.as_view(), name="unsubscribe"),

    path("news/", NewsListView.as_view(), name="news"),
    path("artists/", ArtistListView.as_view(), name="artists"),
    path("diafilms/", DiafilmListView.as_view(), name="diafilms"),
    path("collections/", CollectionListView.as_view(), name="collections"),

    path("points/", GlobePointListView.as_view(), name="globe-points"),
    path("cards/", GlobeCardListView.as_view(), name="globe-cards"),
]

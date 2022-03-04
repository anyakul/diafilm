from django import forms
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Count
from treenode.forms import TreeNodeForm
from wagtail.admin.edit_handlers import (FieldPanel, InlinePanel,
                                         PageChooserPanel)
from wagtail.contrib.forms.edit_handlers import FormSubmissionsPanel
from wagtail.contrib.modeladmin.options import (ModelAdmin, ModelAdminGroup,
                                                modeladmin_register)
from wagtail.core import hooks

from core.image_operations import GrayscaleOperation
from core.models import Day, Diafilm, Location, Person


@hooks.register('register_image_operations')
def register_image_operations():
    return [
        ('grayscale', GrayscaleOperation),
    ]


class DiafilmAdmin(ModelAdmin):
    model = Diafilm
    menu_label = 'Диафильм'  # ditch this to use verbose_name_plural from model
    menu_icon = 'doc-full-inverse'  # change as required
    menu_order = 200  # will put in 3rd place (000 being 1st, 100 2nd)
    add_to_settings_menu = False
    exclude_from_explorer = True
    list_display = ('title', 'eid', 'kind', 'is_colored', 'page')
    list_filter = ('is_colored', 'kind',)
    search_fields = ('title', )
    ordering = ('title', )

    # little hack to handle doc on save in our manner
    panels = Diafilm.panels + [
        FieldPanel("doc", widget=forms.CheckboxInput()),
    ]


class PersonAdmin(ModelAdmin):
    model = Person
    menu_label = 'Персоны'
    menu_icon = 'group'
    menu_order = 200
    add_to_settings_menu = False
    exclude_from_explorer = False
    list_display = (
        'full_name', 'birthday', 'description',
        'diafilm_count', 'role_list',
    )
    list_filter = ('birthday', 'roles__role')
    search_fields = ('full_name', 'description')
    ordering = ('full_name', )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.annotate(diafilm_count=Count("roles", distinct=True))
        qs = qs.annotate(role_list=ArrayAgg("roles__role", distinct=True))

        return qs

    def role_list(self, obj):
        return ", ".join(obj.role_list)
    role_list.short_description = "Роли"
    role_list.admin_order_field = "role_list"

    def diafilm_count(self, obj):
        return obj.diafilm_count
    diafilm_count.short_description = "Диафильмов"
    diafilm_count.admin_order_field = "diafilm_count"


class LocationAdmin(ModelAdmin):
    model = Location
    menu_label = 'Места'
    menu_icon = 'site'
    menu_order = 200
    add_to_settings_menu = False
    exclude_from_explorer = False
    list_display = ('admin_title', 'count')
    search_fields = ('title', )
    form = TreeNodeForm
    ordering = ('tn_order', )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # qs = qs.annotate(diafilm_count=Count("diafilms", distinct=True))

        return qs

    def diafilm_count(self, obj):
        return obj.diafilm_count
    diafilm_count.short_description = "Диафильмов"
    diafilm_count.admin_order_field = "diafilm_count"


class DayAdmin(ModelAdmin):
    model = Day
    menu_label = 'Диафильм дня'
    menu_icon = 'site'
    menu_order = 200
    add_to_settings_menu = False
    exclude_from_explorer = False
    list_display = ('admin_title', 'next_date', 'diafilm_page')
    list_filter = ('month', )
    search_fields = ('day', 'month')
    ordering = ('month', 'day')


class LibraryGroup(ModelAdminGroup):
    menu_label = 'Библиотека'
    menu_icon = 'folder-open-inverse'  # change as required
    menu_order = 200  # will put in 3rd place (000 being 1st, 100 2nd)
    items = (DiafilmAdmin, PersonAdmin, LocationAdmin, DayAdmin)


modeladmin_register(LibraryGroup)

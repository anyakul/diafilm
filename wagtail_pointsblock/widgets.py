import json

from django.forms import forms
from django.template.loader import render_to_string
from django.urls import reverse
from wagtail.admin.widgets import AdminChooser
from wagtail.images import get_image_model
from wagtail.images.shortcuts import get_rendition_or_not_found
from wagtail.images.widgets import AdminImageChooser as GenericImageChooser
from wagtail.admin.staticfiles import versioned_static
from django.utils.translation import gettext_lazy as _


class AdminImageChooser(GenericImageChooser):
    @property
    def media(self):
        result = super().media
        result._js_lists[0] += [
            versioned_static("wagtail_pointsblock/js/admin.js"),
        ]
        result._css_lists = [{
            'all': [versioned_static("wagtail_pointsblock/css/admin.css")]
        }]
        return result

    def get_value_data(self, value):
        if value is None:
            return None
        elif isinstance(value, self.image_model):
            image = value
        else:  # assume image ID
            image = self.image_model.objects.get(pk=value)

        # preview_image = get_rendition_or_not_found(image, 'max-300x300')
        image.url = image.file.url
        preview_image = image

        return {
            'id': image.pk,
            'title': image.title,
            'preview': {
                'url': preview_image.url,
                'width': preview_image.width,
                'height': preview_image.height,
            },
            'edit_url': reverse('wagtailimages:edit', args=[image.id]),
        }

    # def render_html(self, name, value_data, attrs):
    #     value_data = value_data or {}
    #     original_field_html = super().render_html(name, value_data.get('id'), attrs)
    #
    #     return render_to_string("wagtail_pointsblock/image_chooser.html", {
    #         'widget': self,
    #         'original_field_html': original_field_html,
    #         'attrs': attrs,
    #         'value': bool(value_data),  # only used by chooser.html to identify blank values
    #         'title': value_data.get('title', ''),
    #         'preview': value_data.get('preview', {}),
    #         'edit_url': value_data.get('edit_url', ''),
    #     })

    # def render_js_init(self, id_, name, value_data):
    #     return "createImageChooser({0});".format(json.dumps(id_))
    #
    # @property
    # def media(self):
    #     return forms.Media(js=[
    #         versioned_static('wagtailimages/js/image-chooser-modal.js'),
    #         versioned_static('wagtailimages/js/image-chooser.js'),
    #     ])


class BigAdminImageChooser2(AdminChooser):
    choose_one_text = _('Choose an image')
    choose_another_text = _('Change image')
    link_to_chosen_text = _('Edit this image')

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.image_model = get_image_model()

    @property
    def media(self):
        result = super().media
        result._js_lists[0] += [
            versioned_static("wagtail_pointsblock/js/admin.js"),
        ]
        result._css_lists = [{
            'all': [versioned_static("wagtail_pointsblock/css/admin.css")]
        }]
        return result

    # we need to reset only template path
    def render_html(self, name, value_data, attrs):
        value_data = value_data or {}
        original_field_html = super().render_html(name, value_data.get('id'), attrs)

        return render_to_string("wagtail_pointsblock/image_chooser.html", {
            'widget': self,
            'original_field_html': original_field_html,
            'attrs': attrs,
            'value': bool(value_data),  # only used by chooser.html to identify blank values
            'title': value_data.get('title', ''),
            'preview': value_data.get('preview', {}),
            'edit_url': value_data.get('edit_url', ''),
        })

    def get_value_data(self, value):
        if value is None:
            return None
        elif isinstance(value, self.image_model):
            image = value
        else:  # assume image ID
            image = self.image_model.objects.get(pk=value)

        return {
            'id': image.pk,
            'title': image.title,
            'preview': {
                'url': image.file.url,
                'width': image.width,
                'height': image.height,
            },
            'edit_url': reverse('wagtailimages:edit', args=[image.id]),
        }

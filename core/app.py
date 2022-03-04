from django.apps import AppConfig


class HomeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        import core.signals

        # self.discover_chunks()

    def discover_chunks(self):
        import os

        from django.conf import settings
        from django.template.loaders.app_directories import \
            get_app_template_dirs

        template_dir_list = []
        for template_dir in get_app_template_dirs("templates"):
            template_dir = str(template_dir)
            if settings.BASE_DIR in template_dir:
                template_dir_list.append(template_dir)

        template_list = []
        for template_dir in (template_dir_list + settings.TEMPLATES[0]["DIRS"]):
            for base_dir, dirnames, filenames in os.walk(template_dir):
                for filename in filenames:
                    template_list.append(os.path.join(base_dir, filename))

        for tmpl in template_list:
            print(tmpl)

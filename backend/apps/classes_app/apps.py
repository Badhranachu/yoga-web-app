from django.apps import AppConfig


class ClassesAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.classes_app'
    label = 'classes_app'

    def ready(self):
        from . import signals  # noqa: F401

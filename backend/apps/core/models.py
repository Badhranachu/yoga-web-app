from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base adding created/updated timestamps. Every domain app
    model should inherit from this instead of redeclaring the fields."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class StudioSetting(TimeStampedModel):
    """Generic admin-configurable key/value store for studio-wide values
    that must never be hardcoded in application code (rule: everything
    configurable belongs in the admin panel, not in source).

    Values are stored as text and cast by the caller via the typed
    accessors below — this keeps the table generic enough to hold future
    settings (booking windows, cancellation policy, etc.) without a schema
    change per setting.
    """

    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'core_studio_setting'
        ordering = ['key']

    def __str__(self):
        return f'{self.key}={self.value}'

    @classmethod
    def get_int(cls, key: str, default: int) -> int:
        try:
            return int(cls.objects.get(key=key).value)
        except (cls.DoesNotExist, ValueError):
            return default

    @classmethod
    def set_value(cls, key: str, value, description: str = '') -> 'StudioSetting':
        setting, _ = cls.objects.update_or_create(
            key=key,
            defaults={'value': str(value), **({'description': description} if description else {})},
        )
        return setting

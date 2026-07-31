from django.contrib import admin

from .models import StudioSetting


@admin.register(StudioSetting)
class StudioSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'value', 'description', 'updated_at']
    search_fields = ['key', 'description']

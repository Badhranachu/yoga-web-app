from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'notification_type', 'title', 'is_read', 'channel', 'created_at']
    list_filter = ['notification_type', 'channel', 'is_read']
    search_fields = ['recipient__email', 'title', 'message', 'dedupe_key']
    readonly_fields = ['created_at', 'updated_at']

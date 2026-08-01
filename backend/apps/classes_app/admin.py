from django.contrib import admin

from .models import Leave, Slot, TimetableConfig


@admin.register(TimetableConfig)
class TimetableConfigAdmin(admin.ModelAdmin):
    list_display = ['weekday_label', 'is_open', 'start_time', 'end_time', 'slot_duration_minutes']
    list_editable = ['is_open', 'start_time', 'end_time', 'slot_duration_minutes']
    ordering = ['weekday']

    @admin.display(description='Weekday')
    def weekday_label(self, obj):
        return obj.get_weekday_display()


@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ['date', 'start_time', 'end_time', 'is_booked', 'availability_label', 'leave']
    list_filter = ['is_booked', 'date']
    date_hierarchy = 'date'
    ordering = ['date', 'start_time']
    readonly_fields = [field.name for field in Slot._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description='Availability')
    def availability_label(self, obj):
        return Slot.Availability(obj.availability).label


@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ['start_date', 'end_date', 'reason', 'created_by', 'created_at']
    list_filter = ['start_date']
    date_hierarchy = 'start_date'
    ordering = ['-start_date']
    readonly_fields = ['created_by', 'created_at', 'updated_at']

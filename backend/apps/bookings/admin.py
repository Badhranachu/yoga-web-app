from django.contrib import admin

from apps.classes_app.models import Slot

from .models import Booking, BookingChangeRequest


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'slot', 'status', 'attended_at', 'created_at']
    list_filter = ['status']
    search_fields = ['user__email']
    readonly_fields = [field.name for field in Booking._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def delete_model(self, request, obj):
        # Deleting a Booking row directly (admin cleanup) must free its slot
        # — otherwise the Slot is left permanently stuck at is_booked=True
        # with nothing to ever clear it, since no other code path un-books
        # a slot except through the normal reschedule/transfer flow. No
        # session is restored here, matching the no-refund business rule.
        slot = obj.slot
        super().delete_model(request, obj)
        slot.is_booked = False
        slot.save(update_fields=['is_booked', 'updated_at'])

    def delete_queryset(self, request, queryset):
        slots = list(queryset.values_list('slot', flat=True))
        super().delete_queryset(request, queryset)
        Slot.objects.filter(pk__in=slots).update(is_booked=False)


@admin.register(BookingChangeRequest)
class BookingChangeRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'request_type', 'booking', 'requested_by', 'status', 'reviewed_by', 'created_at']
    list_filter = ['request_type', 'status']
    search_fields = ['booking__user__email', 'requested_by__email']
    readonly_fields = [field.name for field in BookingChangeRequest._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

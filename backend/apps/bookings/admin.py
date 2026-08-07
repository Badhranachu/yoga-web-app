from django.contrib import admin

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

    # No delete_model/delete_queryset override needed anymore: slot
    # occupancy (booked_count) is computed live from Booking rows, so
    # deleting a Booking here automatically frees its spot — nothing to
    # separately reset. No session is restored, matching the no-refund
    # business rule.


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

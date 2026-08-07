from django.contrib import admin

from .leave_models import InstructorLeave
from .models import InstructorProfile


@admin.register(InstructorProfile)
class InstructorProfileAdmin(admin.ModelAdmin):
    list_display = ['username', 'user', 'created_at']
    search_fields = ['username', 'user__email']


@admin.register(InstructorLeave)
class InstructorLeaveAdmin(admin.ModelAdmin):
    list_display = ['instructor', 'date', 'is_full_day', 'reason', 'created_at']
    list_filter = ['date']
    search_fields = ['instructor__username', 'instructor__user__email']

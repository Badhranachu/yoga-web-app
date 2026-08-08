from django.urls import path

from .views import (
    AdminBookingListView,
    CreateBookingView,
    InstructorBookingListView,
    InstructorMarkAttendedView,
    InstructorStatsView,
    MarkAttendedView,
    MyBookingHistoryView,
    MyBookingsView,
    ReassignInstructorView,
    RevertAttendedView,
    AdminChangeRequestListView,
    ApproveChangeRequestView,
    CreateTransferRequestView,
    MyChangeRequestListView,
    RejectChangeRequestView,
    SelfRescheduleBookingView,
)

app_name = 'bookings'

urlpatterns = [
    path('', CreateBookingView.as_view(), name='create'),
    path('me/', MyBookingsView.as_view(), name='my-bookings'),
    path('me/history/', MyBookingHistoryView.as_view(), name='my-booking-history'),
    path('admin/', AdminBookingListView.as_view(), name='admin-list'),
    path('instructor/me/', InstructorBookingListView.as_view(), name='instructor-bookings'),
    path('instructor/stats/', InstructorStatsView.as_view(), name='instructor-stats'),
    path('<int:pk>/instructor-attend/', InstructorMarkAttendedView.as_view(), name='instructor-mark-attended'),
    path('<int:pk>/reassign-instructor/', ReassignInstructorView.as_view(), name='reassign-instructor'),
    path('<int:pk>/attend/', MarkAttendedView.as_view(), name='mark-attended'),
    path('<int:pk>/revert-attend/', RevertAttendedView.as_view(), name='revert-attended'),
    path('transfer-requests/', CreateTransferRequestView.as_view(), name='create-transfer-request'),
    path('reschedule/', SelfRescheduleBookingView.as_view(), name='self-reschedule'),
    path('requests/me/', MyChangeRequestListView.as_view(), name='my-change-requests'),
    path('requests/admin/', AdminChangeRequestListView.as_view(), name='admin-change-requests'),
    path('requests/<int:pk>/approve/', ApproveChangeRequestView.as_view(), name='approve-change-request'),
    path('requests/<int:pk>/reject/', RejectChangeRequestView.as_view(), name='reject-change-request'),
]

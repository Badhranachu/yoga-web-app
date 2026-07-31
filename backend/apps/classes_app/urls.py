from django.urls import path

from .views import (
    LeaveDetailView,
    LeaveListCreateView,
    ResyncSlotsView,
    SlotGenerationSettingsView,
    SlotListView,
    TimetableConfigDetailView,
    TimetableConfigListView,
)

app_name = 'classes_app'

urlpatterns = [
    path('timetable/', TimetableConfigListView.as_view(), name='timetable-list'),
    path('timetable/<int:weekday>/', TimetableConfigDetailView.as_view(), name='timetable-detail'),
    path('timetable/settings/horizon/', SlotGenerationSettingsView.as_view(), name='timetable-horizon'),
    path('timetable/resync/', ResyncSlotsView.as_view(), name='timetable-resync'),
    path('slots/', SlotListView.as_view(), name='slot-list'),
    path('leaves/', LeaveListCreateView.as_view(), name='leave-list-create'),
    path('leaves/<int:pk>/', LeaveDetailView.as_view(), name='leave-detail'),
]

from django.urls import path

from .views import AdminDashboardOverviewView

urlpatterns = [
    path('overview/', AdminDashboardOverviewView.as_view(), name='admin-dashboard-overview'),
]

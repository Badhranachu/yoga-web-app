from django.urls import path

from .views import AdminReportView

urlpatterns = [
    path('<str:report>/', AdminReportView.as_view(), name='admin-report'),
]

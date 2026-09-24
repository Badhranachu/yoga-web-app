from django.urls import path

from .views import MemberDetailView, MemberListCreateView

app_name = 'members'

urlpatterns = [
    path('', MemberListCreateView.as_view(), name='list-create-member'),
    path('<int:pk>/', MemberDetailView.as_view(), name='member-detail'),
]

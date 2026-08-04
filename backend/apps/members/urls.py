from django.urls import path

from .views import MemberListCreateView

app_name = 'members'

urlpatterns = [
    path('', MemberListCreateView.as_view(), name='list-create-member'),
]

from django.urls import path

from .views import (
    InstructorDetailView,
    InstructorLeaveDetailView,
    InstructorLeaveListCreateView,
    InstructorListCreateView,
    PublicInstructorListView,
)

app_name = 'instructors'

urlpatterns = [
    path('', InstructorListCreateView.as_view(), name='list-create-instructor'),
    path('public/', PublicInstructorListView.as_view(), name='public-list'),
    path('<int:pk>/', InstructorDetailView.as_view(), name='update-instructor'),
    path('leaves/', InstructorLeaveListCreateView.as_view(), name='list-create-leave'),
    path('leaves/<int:pk>/', InstructorLeaveDetailView.as_view(), name='delete-leave'),
]

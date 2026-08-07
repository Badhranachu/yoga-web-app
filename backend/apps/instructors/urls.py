from django.urls import path

from .views import InstructorLeaveDetailView, InstructorLeaveListCreateView, InstructorListCreateView

app_name = 'instructors'

urlpatterns = [
    path('', InstructorListCreateView.as_view(), name='list-create-instructor'),
    path('leaves/', InstructorLeaveListCreateView.as_view(), name='list-create-leave'),
    path('leaves/<int:pk>/', InstructorLeaveDetailView.as_view(), name='delete-leave'),
]

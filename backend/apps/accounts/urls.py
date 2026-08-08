from django.urls import path

from .views import (
    AdminListCreateView,
    ChangePasswordView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    ProfileView,
    RefreshTokenView,
    RegisterView,
    RequestEmailChangeView,
    ResetPasswordView,
    VerifyEmailChangeView,
)

app_name = 'accounts'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('admins/', AdminListCreateView.as_view(), name='admin-list-create'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('change-email/request/', RequestEmailChangeView.as_view(), name='change-email-request'),
    path('change-email/verify/', VerifyEmailChangeView.as_view(), name='change-email-verify'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
]

from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.responses import error_response, success_response

from .serializers import (
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    RegisterSerializer,
    RequestEmailChangeSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    VerifyEmailChangeSerializer,
)
from .services import (
    EmailChangeError,
    issue_password_reset_token,
    request_email_change,
    reset_password_with_token,
    verify_email_change,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success_response(
            data=UserSerializer(user).data,
            message='Account created successfully.',
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST { email, password } -> { access, refresh, user }."""

    permission_classes = [AllowAny]
    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return success_response(data=serializer.validated_data, message='Login successful.')


class RefreshTokenView(TokenRefreshView):
    """POST { refresh } -> { access }."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return success_response(data=serializer.validated_data, message='Token refreshed.')


class LogoutView(APIView):
    """POST { refresh } -> blacklists the refresh token so it can't be reused."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return error_response('Refresh token is required.', code=status.HTTP_400_BAD_REQUEST)

        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass

        return success_response(message='Logged out successfully.')


class ProfileView(RetrieveUpdateAPIView):
    """GET/PATCH the authenticated user's own profile."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=self.get_serializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=serializer.data, message='Profile updated.')


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return success_response(message='Password changed successfully.')


class RequestEmailChangeView(APIView):
    """POST { new_email } -> sends a 6-digit OTP to new_email, valid for 5
    minutes. The account's email is untouched until VerifyEmailChangeView
    confirms the code.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RequestEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            request_email_change(request.user, serializer.validated_data['new_email'])
        except EmailChangeError as exc:
            return error_response(str(exc))
        return success_response(message='A verification code was sent to the new email address.')


class VerifyEmailChangeView(APIView):
    """POST { otp_code } -> verifies the code against the user's most recent
    pending email-change request and, only on success, updates the account's
    email.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VerifyEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_email_change(request.user, serializer.validated_data['otp_code'])
        except EmailChangeError as exc:
            return error_response(str(exc))
        return success_response(data=UserSerializer(user).data, message='Email updated successfully.')


class ForgotPasswordView(APIView):
    """POST { email } -> always 200, regardless of whether the email exists,
    to avoid leaking which addresses have accounts."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue_password_reset_token(serializer.validated_data['email'])
        return success_response(message='If that email is registered, a reset link has been sent.')


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ok = reset_password_with_token(
            serializer.validated_data['token'],
            serializer.validated_data['new_password'],
        )
        if not ok:
            return error_response(
                'This reset link is invalid or has expired.',
                code=status.HTTP_400_BAD_REQUEST,
            )
        return success_response(message='Password reset successfully.')

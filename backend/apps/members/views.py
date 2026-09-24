from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.permissions import IsAdminRole
from apps.core.responses import success_response

from .models import UserProfile
from .serializers import AdminCreateMemberSerializer, UpdateMemberSerializer, UserProfileSerializer


class MemberListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        profiles = UserProfile.objects.select_related('user').filter(user__is_active=True)
        return success_response(data=UserProfileSerializer(profiles, many=True).data)

    def post(self, request):
        serializer = AdminCreateMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return success_response(
            data=UserProfileSerializer(profile).data,
            message='Member account created successfully.',
            status=status.HTTP_201_CREATED,
        )


class MemberDetailView(APIView):
    """PATCH: edit a customer's username/email/password. DELETE: deactivate
    the account (soft delete via User.is_active, preserving their booking/
    payment history rather than cascading a hard delete)."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        profile = get_object_or_404(UserProfile.objects.select_related('user'), pk=pk)
        serializer = UpdateMemberSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=UserProfileSerializer(profile).data, message='Customer updated successfully.')

    def delete(self, request, pk):
        profile = get_object_or_404(UserProfile.objects.select_related('user'), pk=pk)
        user = profile.user
        user.is_active = False
        user.save(update_fields=['is_active'])
        return success_response(message='Customer account removed.')

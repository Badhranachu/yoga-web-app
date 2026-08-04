from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.permissions import IsAdminRole
from apps.core.responses import success_response

from .models import UserProfile
from .serializers import AdminCreateMemberSerializer, UserProfileSerializer


class MemberListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        profiles = UserProfile.objects.select_related('user').all()
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

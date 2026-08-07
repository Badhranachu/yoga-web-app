from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.permissions import IsAdminRole
from apps.core.responses import error_response, success_response

from .leave_models import InstructorLeave
from .leave_serializers import CreateInstructorLeaveSerializer, InstructorLeaveSerializer
from .models import InstructorProfile
from .serializers import AdminCreateInstructorSerializer, InstructorProfileSerializer


class InstructorListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        profiles = InstructorProfile.objects.select_related('user').all()
        return success_response(data=InstructorProfileSerializer(profiles, many=True).data)

    def post(self, request):
        serializer = AdminCreateInstructorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return success_response(
            data=InstructorProfileSerializer(profile).data,
            message='Instructor account created successfully.',
            status=status.HTTP_201_CREATED,
        )


class InstructorLeaveListCreateView(ListCreateAPIView):
    """GET: full instructor-leave history (admin-only — this is internal
    scheduling info, not member-facing). POST: admin declares an instructor
    unavailable for one date, either the whole day (no slot_ids) or just
    specific slots on that date.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = InstructorLeave.objects.select_related('instructor', 'instructor__user', 'created_by').prefetch_related('slots')

    def get_serializer_class(self):
        return CreateInstructorLeaveSerializer if self.request.method == 'POST' else InstructorLeaveSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        data = InstructorLeaveSerializer(page if page is not None else queryset, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave = serializer.save(created_by=request.user)
        return success_response(
            data=InstructorLeaveSerializer(leave).data,
            message='Instructor leave recorded.',
            status=status.HTTP_201_CREATED,
        )


class InstructorLeaveDetailView(APIView):
    """DELETE an instructor leave record — admin-only, only while still in
    the future (past leave stays as permanent history, same rule as the
    studio-wide Leave model)."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def delete(self, request, pk):
        leave = get_object_or_404(InstructorLeave, pk=pk)
        if leave.date < timezone.localdate():
            return error_response(
                'Past leave is kept as permanent history and cannot be deleted.',
                code=status.HTTP_400_BAD_REQUEST,
            )
        leave.delete()
        return success_response(message='Instructor leave removed.')

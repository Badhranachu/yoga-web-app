from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import StudioSetting
from apps.core.permissions import IsAdminRole
from apps.core.responses import success_response
from apps.core.settings_keys import SLOT_GENERATION_HORIZON_DAYS

from .models import Leave, Slot, TimetableConfig
from .serializers import (
    LeaveSerializer,
    SlotGenerationHorizonSerializer,
    SlotSerializer,
    TimetableConfigSerializer,
)
from .services import (
    apply_leave,
    generate_slots,
    get_generation_horizon_days,
    regenerate_all,
    release_leave,
)


class TimetableConfigListView(APIView):
    """GET: the full 7-row weekly schedule (any authenticated user — the
    timetable is not sensitive, and both admin UI and booking UI need it).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        configs = TimetableConfig.objects.all().order_by('weekday')
        return success_response(data=TimetableConfigSerializer(configs, many=True).data)


class TimetableConfigDetailView(RetrieveUpdateAPIView):
    """GET/PUT/PATCH a single weekday's config. Only admins may write;
    saving triggers regeneration of that weekday's future, unbooked slots
    (see classes_app.signals). Weekday rows always exist (seeded by
    migration) — admins edit them, never create or delete a weekday.
    """

    queryset = TimetableConfig.objects.all()
    serializer_class = TimetableConfigSerializer
    lookup_field = 'weekday'

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs):
        return success_response(data=self.get_serializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=serializer.data, message='Timetable updated. Future slots regenerated.')


class SlotListView(ListAPIView):
    """GET slots, optionally filtered by ?date_from=&date_to=. Defaults to
    today through the configured generation horizon. Read-only — slots are
    always system-generated, never created via this endpoint.
    """

    serializer_class = SlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        today = timezone.localdate()
        date_from = self.request.query_params.get('date_from') or today
        date_to = self.request.query_params.get('date_to') or (today + timedelta(days=get_generation_horizon_days()))
        return Slot.objects.filter(date__gte=date_from, date__lte=date_to).order_by('date', 'start_time')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        data = serializer.data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)


class SlotGenerationSettingsView(APIView):
    """GET/PUT the slot generation horizon (days). Admin-only write.
    Raising the horizon immediately backfills the newly-visible future
    days; lowering it never deletes anything already generated.
    """

    def get_permissions(self):
        if self.request.method == 'PUT':
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def get(self, request):
        return success_response(data={'horizon_days': get_generation_horizon_days()})

    def put(self, request):
        serializer = SlotGenerationHorizonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        horizon_days = serializer.validated_data['horizon_days']

        StudioSetting.set_value(
            SLOT_GENERATION_HORIZON_DAYS,
            horizon_days,
            description='How many days ahead bookable slots are auto-generated.',
        )
        result = generate_slots(horizon_days=horizon_days)

        return success_response(
            data={'horizon_days': horizon_days, 'slots_created': result['created']},
            message='Slot generation horizon updated.',
        )


class LeaveListCreateView(ListCreateAPIView):
    """GET: full leave history (past and future — history is permanent,
    never trimmed). Any authenticated user may read it, since it directly
    determines slot availability they need to see.

    POST: admin-only. Adding a leave blocks every future slot in range
    (apps.classes_app.services.apply_leave) without deleting anything.
    """

    serializer_class = LeaveSerializer
    queryset = Leave.objects.select_related('created_by').all()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        data = serializer.data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave = serializer.save(created_by=request.user)
        result = apply_leave(leave)

        message = f"Leave added. {result['blocked']} slot(s) marked unavailable."
        if result['conflicts']:
            message += f" Warning: {result['conflicts']} already-booked slot(s) now conflict with this leave."

        return success_response(
            data=self.get_serializer(leave).data,
            message=message,
            status=status.HTTP_201_CREATED,
        )


class LeaveDetailView(APIView):
    """DELETE a leave — admin-only, and only while it is still in the
    future. Past leave is permanent history and cannot be removed, per
    business rule. Deleting restores every slot this leave blocked.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def delete(self, request, pk):
        leave = get_object_or_404(Leave, pk=pk)
        today = timezone.localdate()

        if leave.end_date < today:
            return Response(
                {
                    'success': False,
                    'errors': 'Past leave is kept as permanent history and cannot be deleted.',
                    'code': status.HTTP_400_BAD_REQUEST,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = release_leave(leave)
        leave.delete()

        return success_response(
            data=result,
            message=f"Leave removed. {result['restored']} slot(s) restored to available.",
        )


class ResyncSlotsView(APIView):
    """POST: explicit admin action to regenerate all future, unbooked
    slots from the current TimetableConfig. Mainly useful after seeding
    or fixing multiple weekdays at once, to avoid N separate saves each
    triggering their own regeneration.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        result = regenerate_all()
        return success_response(data=result, message='Timetable resynced.', status=status.HTTP_200_OK)

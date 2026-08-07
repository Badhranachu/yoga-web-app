from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.permissions import IsAdminRole, IsInstructorRole
from apps.core.responses import error_response, success_response
from apps.classes_app.serializers import SlotSerializer

from .models import Booking, BookingChangeRequest
from .serializers import (
    BookingChangeRequestSerializer,
    BookingSerializer,
    CreateBookingChangeRequestSerializer,
    CreateBookingSerializer,
    InstructorBookingSerializer,
    ReassignInstructorSerializer,
)
from .services import (
    BookingStateError,
    BookingChangeRequestError,
    SlotConflictError,
    SlotUnavailableError,
    approve_change_request,
    create_reschedule_request,
    create_transfer_request,
    create_booking,
    mark_attended,
    reassign_instructor,
    reject_change_request,
    revert_attended,
)


class CreateBookingView(APIView):
    """POST { slot_id } -> reserves that slot for the authenticated user.
    Race-safe: services.create_booking locks the Slot row for the duration
    of the transaction, so two concurrent requests for the same slot_id
    can never both succeed.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            booking = create_booking(request.user, serializer.validated_data['slot_id'])
        except SlotConflictError as exc:
            return error_response(
                str(exc),
                code=status.HTTP_409_CONFLICT,
                data={
                    'suggested_slot': (
                        SlotSerializer(exc.suggested_slot).data
                        if exc.suggested_slot is not None
                        else None
                    ),
                },
            )
        except SlotUnavailableError as exc:
            return error_response(str(exc))

        return success_response(
            data=BookingSerializer(booking).data,
            message='Slot booked successfully.',
            status=201,
        )


class MyBookingsView(ListAPIView):
    """GET the authenticated user's own booking history — booked and
    attended bookings are all included; nothing is ever hidden.
    """

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related('slot', 'user')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        data = serializer.data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)


class AdminBookingListView(ListAPIView):
    """GET every booking studio-wide (admin-only) — the one-instructor
    studio's full booking log, including attended history.
    """

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = Booking.objects.select_related('slot', 'user').all()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        data = serializer.data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)


class InstructorBookingListView(ListAPIView):
    """GET the authenticated instructor's assigned bookings — includes
    customer contact details (see InstructorBookingSerializer), since the
    instructor needs to know who they're teaching.
    """

    serializer_class = InstructorBookingSerializer
    permission_classes = [IsAuthenticated, IsInstructorRole]

    def get_queryset(self):
        return Booking.objects.filter(
            instructor__user=self.request.user,
        ).select_related('slot', 'user')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        data = self.get_serializer(page if page is not None else queryset, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)


class ReassignInstructorView(APIView):
    """POST { instructor_id } (or null) — admin overrides the auto-assigned
    instructor for a booking, e.g. to correct a bad auto-pick."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)
        serializer = ReassignInstructorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking = reassign_instructor(booking, serializer.validated_data['instructor'])

        return success_response(data=BookingSerializer(booking).data, message='Instructor reassigned.')


class MarkAttendedView(APIView):
    """POST: admin marks a BOOKED booking ATTENDED, deducting one session
    from the user's active subscription (if they have one)."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)

        try:
            booking = mark_attended(booking)
        except BookingStateError as exc:
            return error_response(str(exc))

        return success_response(data=BookingSerializer(booking).data, message='Booking marked as attended.')


class RevertAttendedView(APIView):
    """POST: admin reverts an ATTENDED booking back to BOOKED, restoring
    one session to whichever subscription it was originally deducted from."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)

        try:
            booking = revert_attended(booking)
        except BookingStateError as exc:
            return error_response(str(exc))

        return success_response(data=BookingSerializer(booking).data, message='Attendance reverted.')


class CreateTransferRequestView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        serializer = CreateBookingChangeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            change_request = create_transfer_request(
                request.user,
                serializer.validated_data['booking_id'],
                serializer.validated_data['slot_id'],
            )
        except (Booking.DoesNotExist, BookingChangeRequestError, SlotUnavailableError) as exc:
            return error_response(str(exc))

        return success_response(
            data=BookingChangeRequestSerializer(change_request).data,
            message='Transfer request sent to the member.',
            status=status.HTTP_201_CREATED,
        )


class CreateRescheduleRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateBookingChangeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            change_request = create_reschedule_request(
                request.user,
                serializer.validated_data['booking_id'],
                serializer.validated_data['slot_id'],
            )
        except (Booking.DoesNotExist, BookingChangeRequestError, SlotUnavailableError) as exc:
            return error_response(str(exc))

        return success_response(
            data=BookingChangeRequestSerializer(change_request).data,
            message='Reschedule request sent to the studio.',
            status=status.HTTP_201_CREATED,
        )


class MyChangeRequestListView(ListAPIView):
    serializer_class = BookingChangeRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BookingChangeRequest.objects.filter(
            booking__user=self.request.user,
        ).select_related(
            'booking', 'booking__slot', 'booking__user', 'requested_by',
            'reviewed_by', 'current_slot', 'requested_slot',
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        data = self.get_serializer(page if page is not None else queryset, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)


class AdminChangeRequestListView(ListAPIView):
    serializer_class = BookingChangeRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return BookingChangeRequest.objects.all().select_related(
            'booking', 'booking__slot', 'booking__user', 'requested_by',
            'reviewed_by', 'current_slot', 'requested_slot',
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        data = self.get_serializer(page if page is not None else queryset, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)


class ApproveChangeRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            change_request = approve_change_request(pk, request.user)
        except (BookingChangeRequest.DoesNotExist, BookingChangeRequestError, SlotUnavailableError) as exc:
            return error_response(str(exc), code=status.HTTP_409_CONFLICT)

        return success_response(
            data=BookingChangeRequestSerializer(change_request).data,
            message='Booking change approved.',
        )


class RejectChangeRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            change_request = reject_change_request(pk, request.user, request.data.get('reason', ''))
        except (BookingChangeRequest.DoesNotExist, BookingChangeRequestError) as exc:
            return error_response(str(exc), code=status.HTTP_409_CONFLICT)

        return success_response(
            data=BookingChangeRequestSerializer(change_request).data,
            message='Booking change rejected.',
        )

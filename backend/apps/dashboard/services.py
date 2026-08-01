from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from apps.accounts.models import User
from apps.bookings.models import Booking, BookingChangeRequest
from apps.classes_app.models import Leave, Slot
from apps.payments.models import PaymentTransaction, UserSubscription


def _money(value):
    return str(value or Decimal('0.00'))


def _date_points(start, end):
    day = start
    while day <= end:
        yield day
        day += timedelta(days=1)


def _receipt_number(transaction):
    try:
        return transaction.receipt.receipt_number
    except ObjectDoesNotExist:
        return None


def _trend(queryset, date_field, start, end, value_field=None):
    grouped = queryset.filter(**{f'{date_field}__gte': start, f'{date_field}__lte': end})
    if value_field:
        grouped = grouped.values(date=TruncDate(value_field)).annotate(value=Sum('amount'))
    else:
        grouped = grouped.values(date=TruncDate(date_field)).annotate(value=Count('id'))
    values = {row['date']: row['value'] for row in grouped}
    return [
        {
            'date': day.isoformat(),
            'label': day.strftime('%a'),
            'value': _money(values.get(day)) if value_field else values.get(day, 0),
        }
        for day in _date_points(start, end)
    ]


def build_admin_overview():
    today = timezone.localdate()
    month_start = today.replace(day=1)
    trend_start = today - timedelta(days=6)
    successful = PaymentTransaction.objects.filter(status=PaymentTransaction.Status.SUCCESSFUL)

    metrics = {
        'todays_bookings': Booking.objects.filter(slot__date=today, status=Booking.Status.BOOKED).count(),
        'todays_revenue': _money(successful.filter(created_at__date=today).aggregate(total=Sum('amount'))['total']),
        'monthly_revenue': _money(successful.filter(created_at__date__gte=month_start, created_at__date__lte=today).aggregate(total=Sum('amount'))['total']),
        'total_revenue': _money(successful.aggregate(total=Sum('amount'))['total']),
        'registered_users': User.objects.filter(is_active=True).count(),
        'active_subscriptions': UserSubscription.objects.filter(
            status=UserSubscription.Status.ACTIVE,
            end_date__gte=today,
            sessions_remaining__gt=0,
        ).count(),
        'expired_subscriptions': UserSubscription.objects.filter(
            Q(status=UserSubscription.Status.EXPIRED)
            | Q(status=UserSubscription.Status.ACTIVE, end_date__lt=today)
        ).count(),
        'booked_slots': Slot.objects.filter(date__gte=today, is_booked=True).count(),
        'available_slots': Slot.objects.filter(date__gte=today, is_booked=False, leave__isnull=True).count(),
        'transfer_requests': BookingChangeRequest.objects.filter(
            request_type=BookingChangeRequest.RequestType.TRANSFER,
            status=BookingChangeRequest.Status.PENDING,
        ).count(),
        'upcoming_leaves': Leave.objects.filter(end_date__gte=today).count(),
    }

    payments = [
        {
            'transaction_id': item.transaction_id,
            'user_email': item.user.email,
            'payment_type': item.get_payment_type_display(),
            'amount': _money(item.amount),
            'currency': item.currency,
            'status': item.get_status_display(),
            'receipt_number': _receipt_number(item),
            'created_at': item.created_at,
        }
        for item in successful.select_related('user', 'receipt')[:5]
    ]
    bookings = [
        {
            'id': item.id,
            'user_email': item.user.email,
            'date': item.slot.date,
            'start_time': item.slot.start_time,
            'end_time': item.slot.end_time,
            'status': item.get_status_display(),
            'created_at': item.created_at,
        }
        for item in Booking.objects.select_related('user', 'slot')[:5]
    ]

    return {
        'metrics': metrics,
        'recent_payments': payments,
        'recent_bookings': bookings,
        'trends': {
            'revenue': _trend(successful, 'created_at', trend_start, today, value_field='created_at'),
            'bookings': _trend(
                Booking.objects.filter(status__in=[Booking.Status.BOOKED, Booking.Status.ATTENDED]),
                'slot__date', trend_start, today,
            ),
            'subscriptions': _trend(UserSubscription.objects.all(), 'created_at', trend_start, today),
        },
    }

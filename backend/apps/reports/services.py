import csv
import io
from datetime import date

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone

from apps.accounts.models import User
from apps.bookings.models import Booking, BookingChangeRequest
from apps.classes_app.models import Leave
from apps.payments.models import PaymentTransaction, UserSubscription


REPORTS = {
    'users': {
        'title': 'User Management',
        'columns': ['id', 'name', 'email', 'phone', 'role', 'status', 'created_at'],
    },
    'bookings': {
        'title': 'Booking History',
        'columns': ['id', 'user_email', 'date', 'start_time', 'end_time', 'status', 'created_at'],
    },
    'attendance': {
        'title': 'Attendance History',
        'columns': ['id', 'user_email', 'date', 'start_time', 'status', 'attended_at'],
    },
    'payments': {
        'title': 'Payment History',
        'columns': ['transaction_id', 'user_email', 'payment_type', 'amount', 'currency', 'status', 'created_at', 'receipt_number'],
    },
    'subscriptions': {
        'title': 'Subscription History',
        'columns': ['id', 'user_email', 'status', 'sessions_included', 'sessions_remaining', 'price_paid', 'start_date', 'end_date', 'created_at'],
    },
    'leaves': {
        'title': 'Leave History',
        'columns': ['id', 'start_date', 'end_date', 'reason', 'created_by_email', 'created_at'],
    },
    'transfers': {
        'title': 'Transfer History',
        'columns': ['id', 'request_type', 'status', 'requested_by_email', 'current_date', 'requested_date', 'requested_start_time', 'reviewed_by_email', 'created_at'],
    },
}
MAX_REPORT_ROWS = 10000


def _iso(value):
    return value.isoformat() if value is not None else ''


def _base_filter(queryset, request, fields):
    search = request.query_params.get('search', '').strip()
    if search:
        expression = Q()
        for field in fields:
            expression |= Q(**{f'{field}__icontains': search})
        queryset = queryset.filter(expression)
    return queryset


def _parse_date(value, name):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValidationError({name: 'Use YYYY-MM-DD.'}) from exc


def _limited(queryset):
    rows = list(queryset[:MAX_REPORT_ROWS + 1])
    if len(rows) > MAX_REPORT_ROWS:
        raise ValidationError(f'Report exceeds the {MAX_REPORT_ROWS:,}-row export limit. Narrow the filters.')
    return rows


def _receipt_number(transaction):
    try:
        return transaction.receipt.receipt_number
    except ObjectDoesNotExist:
        return ''


def _rows(report, request):
    search_fields = {
        'users': ['email', 'first_name', 'last_name', 'phone_number'],
        'bookings': ['user__email'], 'attendance': ['user__email'],
        'payments': ['user__email', 'transaction_id'], 'subscriptions': ['user__email'],
        'leaves': ['reason', 'created_by__email'], 'transfers': ['requested_by__email'],
    }
    status = request.query_params.get('status', '').strip()
    request_type = request.query_params.get('request_type', '').strip()
    date_from = _parse_date(request.query_params.get('date_from', '').strip(), 'date_from')
    date_to = _parse_date(request.query_params.get('date_to', '').strip(), 'date_to')
    if date_from and date_to and date_from > date_to:
        raise ValidationError({'date_to': 'date_to must be on or after date_from.'})

    if report == 'users':
        queryset = _base_filter(User.objects.all(), request, search_fields[report])
        if status: queryset = queryset.filter(is_active=status == 'active')
        return [{'id': obj.id, 'name': obj.full_name, 'email': obj.email, 'phone': obj.phone_number, 'role': obj.role, 'status': 'active' if obj.is_active else 'inactive', 'created_at': _iso(obj.created_at)} for obj in _limited(queryset)]

    if report in ('bookings', 'attendance'):
        queryset = _base_filter(Booking.objects.select_related('user', 'slot'), request, search_fields[report])
        if report == 'attendance': queryset = queryset.filter(status=Booking.Status.ATTENDED)
        elif status: queryset = queryset.filter(status=status)
        if date_from: queryset = queryset.filter(slot__date__gte=date_from)
        if date_to: queryset = queryset.filter(slot__date__lte=date_to)
        return [{
            'id': obj.id, 'user_email': obj.user.email, 'date': _iso(obj.slot.date),
            'start_time': _iso(obj.slot.start_time), 'end_time': _iso(obj.slot.end_time),
            'status': obj.status, 'created_at': _iso(obj.created_at), 'attended_at': _iso(obj.attended_at),
        } for obj in _limited(queryset)]

    if report == 'payments':
        queryset = _base_filter(PaymentTransaction.objects.select_related('user', 'receipt'), request, search_fields[report])
        if status: queryset = queryset.filter(status=status)
        if request_type: queryset = queryset.filter(payment_type=request_type)
        if date_from: queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to: queryset = queryset.filter(created_at__date__lte=date_to)
        return [{
            'transaction_id': obj.transaction_id, 'user_email': obj.user.email, 'payment_type': obj.payment_type,
            'amount': str(obj.amount), 'currency': obj.currency, 'status': obj.status,
            'created_at': _iso(obj.created_at), 'receipt_number': _receipt_number(obj),
        } for obj in _limited(queryset)]

    if report == 'subscriptions':
        queryset = _base_filter(UserSubscription.objects.select_related('user'), request, search_fields[report])
        if status: queryset = queryset.filter(status=status)
        if date_from: queryset = queryset.filter(start_date__gte=date_from)
        if date_to: queryset = queryset.filter(end_date__lte=date_to)
        return [{
            'id': obj.id, 'user_email': obj.user.email, 'status': obj.status,
            'sessions_included': obj.sessions_included, 'sessions_remaining': obj.sessions_remaining,
            'price_paid': str(obj.price_paid), 'start_date': _iso(obj.start_date), 'end_date': _iso(obj.end_date),
            'created_at': _iso(obj.created_at),
        } for obj in _limited(queryset)]

    if report == 'leaves':
        queryset = _base_filter(Leave.objects.select_related('created_by'), request, search_fields[report])
        if date_from: queryset = queryset.filter(end_date__gte=date_from)
        if date_to: queryset = queryset.filter(start_date__lte=date_to)
        return [{'id': obj.id, 'start_date': _iso(obj.start_date), 'end_date': _iso(obj.end_date), 'reason': obj.reason, 'created_by_email': obj.created_by.email if obj.created_by else '', 'created_at': _iso(obj.created_at)} for obj in _limited(queryset)]

    queryset = _base_filter(BookingChangeRequest.objects.select_related('requested_by', 'reviewed_by'), request, search_fields[report])
    if status: queryset = queryset.filter(status=status)
    if request_type: queryset = queryset.filter(request_type=request_type)
    if date_from: queryset = queryset.filter(requested_date__gte=date_from)
    if date_to: queryset = queryset.filter(requested_date__lte=date_to)
    return [{
        'id': obj.id, 'request_type': obj.request_type, 'status': obj.status,
        'requested_by_email': obj.requested_by.email, 'current_date': _iso(obj.current_date),
        'requested_date': _iso(obj.requested_date), 'requested_start_time': _iso(obj.requested_start_time),
        'reviewed_by_email': obj.reviewed_by.email if obj.reviewed_by else '', 'created_at': _iso(obj.created_at),
    } for obj in _limited(queryset)]


def build_report(report, request):
    rows = _rows(report, request)
    sort = request.query_params.get('sort', 'created_at')
    if sort not in REPORTS[report]['columns']: sort = 'created_at'
    reverse = request.query_params.get('order', 'desc').lower() == 'desc'
    rows.sort(key=lambda row: str(row.get(sort, '')).lower(), reverse=reverse)
    return rows


def export_report(report, rows, file_format):
    columns = REPORTS[report]['columns']
    title = REPORTS[report]['title']
    if file_format == 'csv':
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(columns)
        writer.writerows([[row.get(column, '') for column in columns] for row in rows])
        response = HttpResponse(stream.getvalue(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{report}-report.csv"'
        return response

    lines = [title, f'Generated: {timezone.localtime().strftime("%Y-%m-%d %H:%M")}', '', ' | '.join(columns)]
    lines.extend(' | '.join(str(row.get(column, '')) for column in columns) for row in rows)
    content_lines = [line[:180] for line in lines[:100]]
    objects = []
    for index, line in enumerate(content_lines):
        safe = line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        objects.append(f'BT /F1 8 Tf 36 {780 - index * 12} Td ({safe}) Tj ET')
    stream = '\n'.join(objects).encode('latin-1', errors='replace')
    pdf_objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>', b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream']
    pdf = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    for index, obj in enumerate(pdf_objects, 1):
        offsets.append(len(pdf)); pdf.extend(f'{index} 0 obj\n'.encode()); pdf.extend(obj); pdf.extend(b'\nendobj\n')
    xref = len(pdf); pdf.extend(f'xref\n0 {len(pdf_objects) + 1}\n0000000000 65535 f \n'.encode()); pdf.extend(b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets[1:])); pdf.extend(f'trailer\n<< /Size {len(pdf_objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode())
    response = HttpResponse(bytes(pdf), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{report}-report.pdf"'
    return response

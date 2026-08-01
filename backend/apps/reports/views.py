from django.core.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.permissions import IsAdminRole
from apps.core.responses import error_response, success_response

from .services import REPORTS, build_report, export_report


class AdminReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, report):
        if report not in REPORTS:
            return error_response('Unknown report.', code=404)
        try:
            rows = build_report(report, request)
        except ValidationError as exc:
            return error_response(
                exc.message_dict if hasattr(exc, 'message_dict') else exc.messages,
                code=400,
            )
        file_format = request.query_params.get('export', '').lower()
        if file_format in ('csv', 'pdf'):
            return export_report(report, rows, file_format)
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        except ValueError:
            return error_response('page and page_size must be integers.')
        start = (page - 1) * page_size
        return success_response(data={
            'report': report, 'title': REPORTS[report]['title'], 'columns': REPORTS[report]['columns'],
            'count': len(rows), 'page': page, 'page_size': page_size,
            'results': rows[start:start + page_size],
        })

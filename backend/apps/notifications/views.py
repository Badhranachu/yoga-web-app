from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import success_response

from .models import Notification
from .serializers import NotificationSerializer
from .services import NotificationService


class NotificationListView(ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get('unread', '').lower() in ('1', 'true', 'yes'):
            queryset = queryset.filter(is_read=False)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        data = self.get_serializer(page if page is not None else queryset, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return success_response(data={'unread_count': count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        NotificationService.mark_read(notification)
        return success_response(data=NotificationSerializer(notification).data, message='Notification marked as read.')


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = NotificationService.mark_all_read(request.user)
        return success_response(data={'marked_read': count}, message='All notifications marked as read.')

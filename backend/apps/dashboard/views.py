from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.permissions import IsAdminRole
from apps.core.responses import success_response

from .serializers import DashboardOverviewSerializer
from .services import build_admin_overview


class AdminDashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        serializer = DashboardOverviewSerializer(build_admin_overview())
        return success_response(data=serializer.data)

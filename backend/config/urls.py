"""
Root URL configuration. Each domain app owns its own urls.py; this file only
mounts them under /api/<domain>/, keeping app boundaries explicit.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/classes/', include('apps.classes_app.urls')),
    path('api/members/', include('apps.members.urls')),
    path('api/trainers/', include('apps.trainers.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/payments/', include('apps.payments.urls')),
]

from rest_framework import serializers


class DashboardOverviewSerializer(serializers.Serializer):
    metrics = serializers.DictField()
    recent_payments = serializers.ListField()
    recent_bookings = serializers.ListField()
    trends = serializers.DictField()

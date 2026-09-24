from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'role', 'created_at']
        read_only_fields = ['id', 'email', 'role', 'created_at']


class AdminCreateMemberSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate_username(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError('Username is required.')
        if UserProfile.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError('This username is already taken.')
        return normalized

    def validate_email(self, value):
        normalized = value.lower().strip()
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized

    def validate_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': "Passwords don't match."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        username = validated_data.pop('username')
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        user = User.objects.create_user(password=password, **validated_data)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.username = username
        profile.save(update_fields=['username', 'updated_at'])
        return profile


class UpdateMemberSerializer(serializers.Serializer):
    """Admin-only: edits a customer's username/email and, optionally,
    password. Separate from AdminCreateMemberSerializer since this edits an
    existing UserProfile + User pair instead of creating one."""

    username = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, style={'input_type': 'password'})

    def validate_username(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError('Username is required.')
        if UserProfile.objects.filter(username__iexact=normalized).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('This username is already taken.')
        return normalized

    def validate_email(self, value):
        normalized = value.lower().strip()
        if User.objects.filter(email=normalized).exclude(pk=self.instance.user_id).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized

    def validate_password(self, value):
        if not value:
            return value
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        username = validated_data.pop('username', None)
        email = validated_data.pop('email', None)
        password = validated_data.pop('password', None)

        if username is not None:
            instance.username = username
            instance.save(update_fields=['username', 'updated_at'])

        if email is not None or password:
            user = instance.user
            if email is not None:
                user.email = email
            if password:
                user.set_password(password)
            user.save()

        return instance

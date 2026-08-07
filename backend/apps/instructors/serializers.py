from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User

from .models import InstructorProfile


class InstructorProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    age = serializers.IntegerField(source='user.age', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = InstructorProfile
        fields = ['id', 'username', 'email', 'age', 'role', 'created_at']
        read_only_fields = ['id', 'email', 'age', 'role', 'created_at']


class AdminCreateInstructorSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    age = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=129)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate_username(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError('Username is required.')
        if InstructorProfile.objects.filter(username__iexact=normalized).exists():
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
        age = validated_data.pop('age', None)
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        user = User.objects.create_user(
            password=password,
            age=age,
            role=User.Role.INSTRUCTOR,
            **validated_data,
        )
        profile, _ = InstructorProfile.objects.get_or_create(user=user)
        profile.username = username
        profile.save(update_fields=['username', 'updated_at'])
        return profile

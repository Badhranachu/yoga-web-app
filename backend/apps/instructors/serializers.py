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
        fields = ['id', 'username', 'email', 'age', 'role', 'photo', 'bio', 'show_on_homepage', 'created_at']
        read_only_fields = ['id', 'email', 'age', 'role', 'created_at']


class UpdateInstructorProfileSerializer(serializers.ModelSerializer):
    """Admin edit — username, email, age, password, photo, and
    homepage-visibility toggle, all optional (partial update). Separate
    from AdminCreateInstructorSerializer since creation also provisions
    the login account while this only edits an existing one."""

    email = serializers.EmailField(source='user.email', required=False)
    age = serializers.IntegerField(source='user.age', required=False, allow_null=True, min_value=1, max_value=129)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, style={'input_type': 'password'})

    class Meta:
        model = InstructorProfile
        fields = ['username', 'email', 'age', 'password', 'photo', 'bio', 'show_on_homepage']
        extra_kwargs = {
            'username': {'required': False},
            'photo': {'required': False},
            'bio': {'required': False},
            'show_on_homepage': {'required': False},
        }

    def validate_username(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError('Username is required.')
        if InstructorProfile.objects.filter(username__iexact=normalized).exclude(pk=self.instance.pk).exists():
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
        user_data = validated_data.pop('user', {})
        password = validated_data.pop('password', None)
        if password:
            instance.user.set_password(password)
            instance.user.save(update_fields=['password', 'updated_at'])
        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save(update_fields=[*user_data.keys(), 'updated_at'])
        return super().update(instance, validated_data)


class PublicInstructorSerializer(serializers.ModelSerializer):
    """Homepage-facing view — only instructors flagged show_on_homepage,
    and only the fields safe to expose publicly (no email/age)."""

    name = serializers.CharField(source='username')

    class Meta:
        model = InstructorProfile
        fields = ['id', 'name', 'photo', 'bio']


class AdminCreateInstructorSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=32)
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

    def validate_first_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Name is required.')
        return value

    def validate_phone_number(self, value):
        if not value.strip():
            raise serializers.ValidationError('WhatsApp number is required.')
        return value

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

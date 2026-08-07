from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Grants access only to users whose accounts.User.role is 'admin'.
    Distinct from DRF's IsAdminUser, which checks is_staff instead."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsInstructorRole(BasePermission):
    """Grants access only to users whose accounts.User.role is 'instructor'."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_instructor)


class IsSelfOrAdmin(BasePermission):
    """Object-level permission: the owning user or an admin may access."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        return obj == request.user

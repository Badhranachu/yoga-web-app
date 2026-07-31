from rest_framework.response import Response


def success_response(data=None, message='', status=200):
    """Shared success envelope so every endpoint returns the same shape as
    the error envelope produced by apps.core.exceptions.api_exception_handler:

        { "success": true, "data": ..., "message": "..." }
    """
    return Response({'success': True, 'data': data, 'message': message}, status=status)

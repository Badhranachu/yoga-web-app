from rest_framework.response import Response


def success_response(data=None, message='', status=200):
    """Shared success envelope so every endpoint returns the same shape as
    the error envelope produced by apps.core.exceptions.api_exception_handler:

        { "success": true, "data": ..., "message": "..." }
    """
    return Response({'success': True, 'data': data, 'message': message}, status=status)


def error_response(errors, code=400, data=None):
    """Shared error envelope for hand-written business-rule rejections in a
    view (as opposed to serializer.is_valid(raise_exception=True), which
    apps.core.exceptions.api_exception_handler already formats this way
    automatically):

        { "success": false, "errors": ..., "code": <status>, "data": ... }
    """
    return Response({'success': False, 'errors': errors, 'code': code, 'data': data}, status=code)

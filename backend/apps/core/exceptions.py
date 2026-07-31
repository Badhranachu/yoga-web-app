from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Wraps DRF's default exception handling so every error response — from
    any app — has the same shape:

        { "success": false, "errors": {...} | [...] | "message", "code": <http status> }

    Keeps error handling consistent across the whole API surface without
    each view having to format its own error payloads.
    """
    response = exception_handler(exc, context)

    if response is None:
        return None

    response.data = {
        'success': False,
        'errors': response.data,
        'code': response.status_code,
    }
    return response

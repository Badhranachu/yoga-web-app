"""Member-domain extension point.

The authenticated account model remains the source of truth for members;
member reports use ``accounts.User`` directly until member-specific fields are
required.
"""

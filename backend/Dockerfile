# Production image only. Local development continues to use
# `python manage.py runserver` against a virtualenv, not this image.
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# mysqlclient (requirements.txt) needs the MySQL client headers + a
# compiler to build against; curl is kept only for the container
# healthcheck below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        default-libmysqlclient-dev \
        pkg-config \
        gcc \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

# collectstatic needs a SECRET_KEY and other settings to be importable,
# but not a live database — DJANGO_SECRET_KEY is set to a throwaway
# build-time value here purely so `config.settings.prod` can be loaded;
# the real value comes from .env.production at container runtime.
RUN DJANGO_SECRET_KEY="build-time-placeholder-not-used-at-runtime-0000000000" \
    DJANGO_DEBUG=False \
    DJANGO_ALLOWED_HOSTS=localhost \
    DB_NAME=build \
    DB_USER=build \
    DB_HOST=localhost \
    DB_PORT=3306 \
    CORS_ALLOWED_ORIGINS=http://localhost \
    FRONTEND_URL=http://localhost \
    EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend \
    python manage.py collectstatic --noinput

RUN addgroup --system app && adduser --system --ingroup app app \
    && chown -R app:app /app \
    && chmod +x /app/entrypoint.sh

USER app

EXPOSE 8000

# No dedicated health endpoint exists in the app (and one isn't being
# added here per the "no application logic changes" constraint), so the
# healthcheck hits the Django admin login page — always present, always
# a 200/302 from a healthy process, no auth required to reach it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS -o /dev/null http://127.0.0.1:8000/admin/login/ || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]

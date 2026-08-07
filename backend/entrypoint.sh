#!/bin/sh
# Production container entrypoint. Runs once per container start, before
# gunicorn takes over. Any failure here stops the container immediately
# (set -e) rather than starting gunicorn against a half-migrated database.
set -e

echo "[entrypoint] Running makemigrations (no-op if nothing changed)..."
python manage.py makemigrations --check --dry-run > /dev/null 2>&1 || python manage.py makemigrations

echo "[entrypoint] Applying migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput

echo "[entrypoint] Starting Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -

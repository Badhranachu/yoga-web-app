# Deployment Guide

## Services

- MySQL 8-compatible database
- Django WSGI application served by Gunicorn or another WSGI server
- Static React build served by a web server such as Nginx
- HTTPS certificate and DNS record for the production host

## Backend

1. Provision a private MySQL database and a least-privilege application user.
2. Create a production environment file from `backend/.env.example`.
3. Set a randomly generated `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`,
   `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, database credentials, and
   the production `FRONTEND_URL`.
4. Install dependencies with `pip install -r requirements.txt`.
5. Run `python manage.py check --deploy --settings=config.settings.prod`.
6. Run `python manage.py migrate --settings=config.settings.prod`.
7. Run `python manage.py collectstatic --noinput --settings=config.settings.prod`.
8. Start the WSGI server with `config.wsgi:application`.

Production settings fail fast when the secret key, database name/user/host/
port, CORS origins, frontend URL, or email backend are missing. Configure a
shared cache (Redis or equivalent) for multi-worker deployments so DRF request
throttles are shared across processes.

Payment-mutating endpoints are intentionally disabled by production settings
until a real gateway adapter is integrated. Do not enable them against the
current internal ledger-only implementation: it records a successful payment
without charging an external provider.

Do not commit `.env`, expose MySQL publicly, or run production with the
development settings module. Configure a daily database backup and monitor
failed migrations, 5xx responses, and email delivery.

## Frontend

1. Set `VITE_API_BASE_URL` to the production API prefix.
2. Run `npm ci` and `npm run build` in `frontend/`.
3. Serve `frontend/dist` as a single-page application with fallback to
   `index.html`.
4. Proxy `/api` to Django if the frontend and backend share a host.

The backend remains responsible for all authorization; hiding a frontend route
is not a security boundary.

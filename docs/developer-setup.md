# Developer Setup Guide

## Prerequisites

- Python version listed in `runtime.txt`
- Node.js and npm
- MySQL 8-compatible server

## Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver
```

Set local database credentials and keep `DJANGO_DEBUG=True` only in local
development. The development server runs on `http://localhost:8000`.

## Frontend

```powershell
cd frontend
npm ci
npm run dev
```

The Vite server runs on `http://localhost:5173` and proxies `/api` to Django.
Use `npm run build` for the production bundle and `npm run lint` for Oxlint.

## Working conventions

- Keep domain rules in backend services, not views or React components.
- Use `transaction.atomic()` and row locks for state transitions.
- Reuse shared response envelopes, permissions, design tokens, and API clients.
- Add migrations for model/index changes and run migration checks before review.
- Preserve booked slots, booking history, payment history, and audit records.

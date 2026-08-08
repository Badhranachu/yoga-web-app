# Harmony Fusion Studio — Studio Management System

A single React frontend (public website + admin dashboard) backed by a single
Django modular-monolith API.

## Structure

```
yoga app/
  frontend/   React 19 + Vite + React Router + Axios (public site & dashboard)
  backend/    Django 5 + DRF + SimpleJWT + MySQL, apps/ modular monolith
```

Only one frontend and one backend exist in this repository. The public
marketing site and the studio-management dashboard are both routes inside
the same React app, sharing one design system (`frontend/src/shared`).

The original standalone homepage (`../home page`) is the design source of
truth: its palette, typography, animations, navbar, footer, and sections were
extracted into `frontend/src/shared` and `frontend/src/features/public-site`
without visual changes.

## Frontend

Feature-based modules under `frontend/src/features/*`:

- `public-site/home` — the marketing homepage (public website)
- `auth` — login / session (placeholder)
- `dashboard-overview`, `classes`, `members`, `trainers`, `bookings`, `payments`
  — dashboard feature modules (placeholder routes, no business logic yet)

Shared design system under `frontend/src/shared`:

- `styles/tokens.css` — color/typography design tokens (Tailwind `@theme` + CSS vars)
- `styles/base.css` — global styles, fonts, glassmorphism utilities
- `ui/` — Button, RevealSection, icons
- `layout/` — Navbar, Footer, PublicLayout, DashboardLayout
- `lib/` — axios client, motion presets

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173, proxies /api to the Django backend
npm run build
```

## Backend

Modular monolith: one Django project (`config`), one app per business domain
under `backend/apps/`.

```
backend/
  config/           project settings (config/settings/base|dev|prod.py), root urls
  apps/
    core/           shared base models, permissions, pagination (cross-cutting)
    accounts/       users & JWT auth
    classes_app/    class scheduling
    members/        member management
    trainers/       trainer management
    bookings/       class bookings
    payments/       invoices & payments
```

Each domain app owns its own `models.py`, `serializers.py`, `views.py`,
`urls.py`, `admin.py`, `migrations/`. Root `config/urls.py` mounts each app
under `/api/<domain>/`. No business logic has been implemented yet — this is
architecture only.

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
pip install -r requirements.txt
cp .env.example .env          # fill in DB credentials, secret key
python manage.py migrate
python manage.py runserver
```

Requires a running MySQL server and Python 3.12 (pinned in `runtime.txt`;
scaffolded and verified against 3.11 while 3.12 is not yet installed locally —
re-pin once available).

## Conventions

- Frontend path alias `@/*` → `frontend/src/*`.
- Backend domain apps are referenced as `apps.<name>` (see `INSTALLED_APPS`
  in `config/settings/base.py`) to keep them namespaced under `apps/`.
- Never hardcode colors in new dashboard code — use the Tailwind tokens
  registered in `frontend/src/shared/styles/tokens.css` (e.g. `bg-sand`,
  `text-gold`) or the CSS variables (`var(--gold)`).

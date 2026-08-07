#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path


def _load_local_env():
    """Loads .env.local (project root, one level up from backend/) into
    the process environment for local development.

    python-decouple's AutoConfig only auto-discovers a file literally
    named `.env` — it never finds `.env.local` on its own. Rather than
    changing how any settings module reads config, this loads the file's
    values into os.environ before Django settings are imported;
    decouple's config() already checks os.environ first, so this is
    transparent to every existing config() call.

    Never overrides a variable already set in the real environment (e.g.
    the Docker container in production, which uses .env.production via
    docker-compose's env_file — this loader never runs there since it's
    only invoked from manage.py, not wsgi.py).
    """
    env_path = Path(__file__).resolve().parent.parent / '.env.local'
    if not env_path.is_file():
        return

    from decouple import RepositoryEnv

    for key, value in RepositoryEnv(str(env_path)).data.items():
        os.environ.setdefault(key, value)


def main():
    """Run administrative tasks."""
    _load_local_env()
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

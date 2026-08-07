#!/usr/bin/env bash
# Runs ON THE VPS, from /var/www/harmony, invoked over SSH by
# .github/workflows/deploy.yml after `git pull origin main` has already
# updated this file (and everything else) to the pushed commit.
#
# Rebuilds and restarts every service, then blocks until every container
# reports "healthy" — `docker compose up -d` only waits for containers to
# START, not for their HEALTHCHECK to pass, so without this loop the
# workflow would report success the instant the images finished building,
# even if the app never actually comes up. Exits non-zero (which fails
# the GitHub Actions job) if any container reports "unhealthy" or the
# wait times out, after printing `docker compose ps` and, on failure
# specifically, the backend's last 100 log lines.
#
# Deliberately not `set -e`: every command below has explicit,
# intentional error handling, and an unexpected failure partway through
# the health-check polling loop must still fall through to the
# ps/logs diagnostics at the bottom rather than aborting silently.
set -uo pipefail

MAX_WAIT_SECONDS="${DEPLOY_HEALTH_TIMEOUT_SECONDS:-180}"
POLL_INTERVAL_SECONDS=5

echo "==> docker compose down"
if ! docker compose down; then
  echo "docker compose down failed."
  exit 1
fi

echo "==> docker compose up -d --build"
if ! docker compose up -d --build; then
  echo "docker compose up failed to start."
  docker compose ps
  exit 1
fi

echo "==> Waiting for containers to report healthy (timeout: ${MAX_WAIT_SECONDS}s)..."
elapsed=0
deploy_failed=0

while true; do
  # One container id per line, for every service in this compose project.
  container_ids="$(docker compose ps -q)"

  if [ -z "$container_ids" ]; then
    echo "No containers are running — deployment did not start anything."
    deploy_failed=1
    break
  fi

  all_healthy=1
  any_unhealthy=0

  while IFS= read -r cid; do
    [ -z "$cid" ] && continue
    name="$(docker inspect --format '{{.Name}}' "$cid" 2>/dev/null | sed 's#^/##')"
    # Every service in this project (db, backend, frontend) defines a
    # HEALTHCHECK, so "none" here would itself be unexpected — treat it
    # as not-ready rather than silently passing.
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null)"
    echo "  - ${name:-$cid}: ${status:-unknown}"

    if [ "$status" = "unhealthy" ]; then
      any_unhealthy=1
    fi
    if [ "$status" != "healthy" ]; then
      all_healthy=0
    fi
  done <<< "$container_ids"

  if [ "$any_unhealthy" -eq 1 ]; then
    echo "One or more containers reported unhealthy."
    deploy_failed=1
    break
  fi

  if [ "$all_healthy" -eq 1 ]; then
    echo "All containers are healthy."
    break
  fi

  if [ "$elapsed" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "Timed out after ${MAX_WAIT_SECONDS}s waiting for containers to become healthy."
    deploy_failed=1
    break
  fi

  sleep "$POLL_INTERVAL_SECONDS"
  elapsed=$((elapsed + POLL_INTERVAL_SECONDS))
done

echo "==> docker compose ps"
docker compose ps

if [ "$deploy_failed" -eq 1 ]; then
  echo "==> Deployment failed — last 100 lines of backend logs:"
  docker compose logs --tail=100 backend
  exit 1
fi

echo "==> Deployment succeeded — all containers healthy."

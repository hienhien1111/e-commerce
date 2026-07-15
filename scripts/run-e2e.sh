#!/usr/bin/env bash
# Runs E2E tests against an isolated Docker-only PostgreSQL database.
set -Eeuo pipefail

if [[ ! -f .env ]]; then
  echo "Missing .env. Run: bash scripts/generate-env.sh"
  exit 1
fi

compose=(docker compose -f docker-compose.e2e.yaml)

cleanup() {
  "${compose[@]}" down -v
}

trap cleanup EXIT
"${compose[@]}" up --build --abort-on-container-exit --exit-code-from api-test

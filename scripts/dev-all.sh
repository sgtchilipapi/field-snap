#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "Starting Postgres..."
docker compose up -d postgres

echo "Waiting for Postgres to become ready..."
until docker compose exec -T postgres pg_isready -U postgres -d field_snap >/dev/null 2>&1; do
  sleep 1
done

echo "Running database migrations..."
npm run db:migrate

echo "Starting Field-Snap..."
exec npm run dev

#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TUNNEL_CONTAINER_ID=""

cd "$ROOT_DIR"

load_env_file() {
  local file_path="$1"

  if [[ -f "$file_path" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file_path"
    set +a
  fi
}

cleanup() {
  if [[ -n "$TUNNEL_CONTAINER_ID" ]]; then
    echo "Stopping Cloudflare tunnel..."
    docker stop "$TUNNEL_CONTAINER_ID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.local"

if [[ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  if [[ -z "${CLOUDFLARE_TUNNEL_URL:-}" ]]; then
    echo "CLOUDFLARE_TUNNEL_URL must be set when CLOUDFLARE_TUNNEL_TOKEN is enabled." >&2
    exit 1
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required when CLOUDFLARE_TUNNEL_TOKEN is set." >&2
    exit 1
  fi

  export APP_BASE_URL="$CLOUDFLARE_TUNNEL_URL"

  echo "Starting Cloudflare tunnel from Docker..."
  TUNNEL_CONTAINER_ID="$(
    docker run \
      --detach \
      --rm \
      --network host \
      cloudflare/cloudflared:latest \
      tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
  )"
  echo "APP_BASE_URL set to ${APP_BASE_URL}"
fi

echo "Starting Postgres..."
docker compose up -d postgres

echo "Waiting for Postgres to become ready..."
until docker compose exec -T postgres pg_isready -U postgres -d field_snap >/dev/null 2>&1; do
  sleep 1
done

echo "Running database migrations..."
npm run db:migrate

echo "Starting Field-Snap..."
npm run dev

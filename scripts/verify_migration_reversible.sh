#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/app/backend"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for migration reversibility check"
  exit 1
fi

if ! docker compose ps postgres >/dev/null 2>&1; then
  echo "postgres service is not available via docker compose"
  exit 1
fi

MIGRATION_DB="migration_probe"

DB_PASSWORD="${DB_PASSWORD:-dev_password_123}"
BASE_URL="postgresql+asyncpg://rw_user:${DB_PASSWORD}@localhost:5432"

cd "${BACKEND_DIR}"

docker compose exec -T postgres psql -U rw_user -d postgres -c "DROP DATABASE IF EXISTS ${MIGRATION_DB};"
docker compose exec -T postgres psql -U rw_user -d postgres -c "CREATE DATABASE ${MIGRATION_DB};"

export DATABASE_URL="${BASE_URL}/${MIGRATION_DB}"

echo "[migration] upgrade head"
alembic upgrade head

echo "[migration] downgrade base"
alembic downgrade base

echo "[migration] re-upgrade head"
alembic upgrade head

echo "[migration] cleanup"
docker compose exec -T postgres psql -U rw_user -d postgres -c "DROP DATABASE IF EXISTS ${MIGRATION_DB};"

echo "migration reversibility check passed"

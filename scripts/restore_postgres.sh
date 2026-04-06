#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <dump-file>"
  exit 1
fi

DUMP_FILE="$1"
if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "Dump file not found: ${DUMP_FILE}"
  exit 1
fi

echo "[restore] terminating active sessions"
docker compose exec -T postgres psql -U rw_user -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='research_workspace' AND pid <> pg_backend_pid();"

echo "[restore] recreating database"
docker compose exec -T postgres psql -U rw_user -d postgres -c "DROP DATABASE IF EXISTS research_workspace;"
docker compose exec -T postgres psql -U rw_user -d postgres -c "CREATE DATABASE research_workspace;"

echo "[restore] restoring ${DUMP_FILE}"
cat "${DUMP_FILE}" | docker compose exec -T postgres pg_restore -U rw_user -d research_workspace --clean --if-exists --no-owner --no-privileges

echo "[restore] completed"

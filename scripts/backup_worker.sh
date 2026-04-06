#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
DB_NAME="${POSTGRES_DB:-research_workspace}"
DB_USER="${POSTGRES_USER:-rw_user}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"

mkdir -p "${BACKUP_DIR}"

echo "[backup-worker] started (interval=${INTERVAL_SECONDS}s retention=${RETENTION_DAYS}d)"

while true; do
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  OUT="${BACKUP_DIR}/${DB_NAME}_${TS}.dump"

  echo "[backup-worker] creating ${OUT}"
  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -Fc > "${OUT}"

  echo "[backup-worker] pruning backups older than ${RETENTION_DAYS} days"
  find "${BACKUP_DIR}" -type f -name "*.dump" -mtime +"${RETENTION_DAYS}" -delete

  echo "[backup-worker] sleeping ${INTERVAL_SECONDS}s"
  sleep "${INTERVAL_SECONDS}"
done

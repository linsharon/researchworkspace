#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups/postgres"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_FILE="${BACKUP_DIR}/research_workspace_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[backup] writing ${OUTPUT_FILE}"
docker compose exec -T postgres \
  pg_dump -U rw_user -d research_workspace -Fc \
  > "${OUTPUT_FILE}"

echo "[backup] completed"

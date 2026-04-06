#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/reports/prelaunch"
REPORT_FILE="${REPORT_DIR}/prelaunch_$(date -u +%Y%m%dT%H%M%SZ).txt"

mkdir -p "${REPORT_DIR}"
exec > >(tee -a "${REPORT_FILE}") 2>&1

echo "Pre-launch Checklist"
echo "===================="

echo "[1/7] backend static checks"
python -m compileall "${ROOT_DIR}/app/backend" >/dev/null

echo "[2/7] frontend lint"
cd "${ROOT_DIR}/app/frontend"
pnpm lint


echo "[3/7] frontend build"
pnpm build


echo "[4/7] integration tests"
cd "${ROOT_DIR}"
/workspaces/researchworkspace/.venv/bin/python scripts/integration_tests.py


echo "[5/7] readiness gate"
READY_CODE="$(curl -s -o /tmp/prelaunch_ready.json -w "%{http_code}" http://localhost:8000/ops/health/ready || true)"
if [[ "${READY_CODE}" != "200" ]]; then
  echo "readiness check failed with code ${READY_CODE}"
  cat /tmp/prelaunch_ready.json || true
  exit 1
fi
cat /tmp/prelaunch_ready.json

echo "[6/7] migration reversibility dry-run"
"${ROOT_DIR}/scripts/verify_migration_reversible.sh"


echo "[7/7] ops alerts baseline"
ALERTS_CODE="$(curl -s -o /tmp/prelaunch_alerts.json -w "%{http_code}" "http://localhost:8000/ops/alerts" -H "Authorization: Bearer ${ADMIN_TOKEN:-}" || true)"
echo "ops/alerts http=${ALERTS_CODE}"
cat /tmp/prelaunch_alerts.json || true

echo "All pre-launch checks completed"
echo "Report: ${REPORT_FILE}"

# Backup and Restore Playbook

## Scope
This playbook defines minimum viable backup and recovery procedures for PostgreSQL and MinIO in staging/production-like environments.

## RPO/RTO Targets
- RPO: 24 hours (daily full backup)
- RTO: 2 hours (restore + smoke validation)

## What to Back Up
- PostgreSQL database: logical dump (`pg_dump` custom format)
- MinIO object storage: bucket-level mirror/snapshot
- Application config snapshots: `.env.staging` or runtime environment manifest (without secrets in git)

## Backup Schedule
- Daily full backup at 02:00 UTC
- Retention:
  - Daily backups: 14 days
  - Weekly backups: 8 weeks
  - Monthly backups: 6 months

## 1) PostgreSQL Backup

### Docker Compose environment
```bash
./scripts/backup_postgres.sh
```

### Manual backup command
```bash
docker compose exec -T postgres \
  pg_dump -U rw_user -d research_workspace -Fc \
  > backups/postgres/research_workspace_$(date -u +%Y%m%dT%H%M%SZ).dump
```

## 2) MinIO Backup (mirror)

### Prepare `mc` alias
```bash
mc alias set local http://localhost:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
```

### Mirror bucket data
```bash
mc mirror --overwrite local/documents backups/minio/documents
```

## 3) Restore Procedure

### PostgreSQL restore
```bash
./scripts/restore_postgres.sh backups/postgres/<dump-file>.dump
```

### MinIO restore
```bash
mc mirror --overwrite backups/minio/documents local/documents
```

## 4) Post-Restore Validation Checklist
- Backend health: `curl http://localhost:8000/database/health`
- Readiness: `curl http://localhost:8000/ops/health/ready`
- Verify key API flow:
  - login
  - list/create project
  - list/create document
  - upload/download URL generation
- Run integration suite:
```bash
/workspaces/researchworkspace/.venv/bin/python scripts/integration_tests.py
```

## 5) Incident Procedure
1. Declare incident and freeze write traffic.
2. Capture current DB state before restore if possible.
3. Restore latest validated backup.
4. Run post-restore validation checklist.
5. Re-open write traffic.
6. Publish incident summary with restored backup timestamp.

## Notes
- Store backup artifacts outside the application host (e.g., secure object storage).
- Encrypt backup archives at rest and in transit.
- Regularly test restore in staging (at least monthly).

# Production Execution Plan (Demo -> Launch)

## Goal
Build this project into a production-ready platform with:
- User registration/login and permission control
- Document/paper management and lifecycle
- Durable persistence for all core business data
- Full activity logging/audit trail
- Deployable, observable, and secure operations baseline

## Execution Mode
I will execute this in milestones, each with clear acceptance criteria.
After each milestone, I will run checks and report completion status.

## Milestones

### M1. Data and Access Control Foundation
Scope:
- Add ownership fields and access boundaries to core business entities
- Enforce auth and data isolation in manuscript endpoints
- Remove unauthenticated access paths for user data

Deliverables:
- Schema updates and Alembic migration
- Router-level auth dependencies for protected APIs
- Service/query-level ownership filtering

Acceptance:
- User A cannot read/update/delete User B data
- Unauthenticated requests to protected endpoints fail with 401

---

### M2. Activity Logging and Audit Trail
Scope:
- Add append-only activity/audit table
- Capture key user actions and request metadata

Deliverables:
- `activity_events` table
- Event writer service and middleware/hooks
- Event coverage for auth + manuscript CRUD + storage operations

Acceptance:
- Every key operation produces a traceable audit record
- Records include who/when/what/resource/request_id

---

### M3. Frontend De-demo and Real Persistence
Scope:
- Replace demo-only localStorage primary persistence with backend-first persistence
- Keep local cache only as non-authoritative fallback where needed

Deliverables:
- Frontend API layer normalization for auth token + error handling
- Removal/reduction of mock-only paths in reading/workflow critical flows
- State hydration from backend for main pages

Acceptance:
- Data survives refresh/relogin/device switch via backend
- Core flows operate with real backend data

---

### M4. Document Management Hardening
Scope:
- Document metadata and file lifecycle management
- Upload/download controls and consistency

Deliverables:
- Stable file metadata model and APIs
- Safer upload/download path and validation
- Soft delete/restore strategy for docs (if required by current product scope)

Acceptance:
- Upload/list/download/delete operations are reliable and permission-checked

---

### M5. Production Readiness (Ops/Security)
Scope:
- Environment separation and secret handling
- Logging/monitoring/health baselines
- Deployment and recovery baselines

Deliverables:
- Production env contract and startup checks
- Structured logs and core health endpoints
- Backup/restore playbook draft

Acceptance:
- Staging deploy can run full user journey
- Critical failure path has diagnostics and recovery procedure

## Immediate Next Implementation Batch
1. Protect manuscript APIs with authentication.
2. Introduce ownership to project/paper/note/highlight/concept models.
3. Add migration draft and apply query filtering by current user.
4. Validate backend errors and route behavior.
5. Add admin activity query endpoints for audit verification.

## Working Rules
- Minimal, safe, incremental changes.
- Keep backward compatibility where practical, with explicit migration steps.
- After each batch: code changes + quick verification + short report.

## Progress Tracking
- [x] Plan committed
- [x] M1 core done (auth + ownership isolation for manuscript APIs)
- [x] M2 foundation done (activity_events table + request middleware + admin query API)
- [x] M3 done (frontend backend-first persistence and workflow cache governance)
- [x] M4 done (document metadata/version lifecycle + upload/download safety checks + soft delete/restore + permission/status guardrails)
- [~] M5 in progress (runtime config contract checks + health probes + backup/restore playbook and scripts)

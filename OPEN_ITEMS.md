# Open Items

## Remaining M5 Work
- Add error tracking integration (Sentry or equivalent).
- Add metrics scraping/export path (Prometheus or equivalent).
- Route alerts to external notification channel.
- Execute and document a full restore drill using production-like data.
- Define data retention and audit retention policy.
- Add security review for CSP compatibility and XSS/CSRF verification.
- Add load/performance benchmark report for auth, document, and search endpoints.
- Lock deployment procedure and rollback checklist with named owners.

## Nice-to-Have
- Add automated MinIO backup/mirror job alongside PostgreSQL backup worker.
- Add signed release artifact/version manifest.
- Add dashboard page for ops metrics in admin UI.

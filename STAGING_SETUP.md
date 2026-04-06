# Staging Environment Setup & Testing Guide

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Git checkout of the repository

### 1. Start Staging Environment

```bash
# Clone repository
git clone <repo-url>
cd researchworkspace

# Create .env file for staging
cat > .env.staging << EOF
DB_PASSWORD=your_secure_db_password
POSTGRES_PORT=5432
REDIS_PORT=6379
BACKEND_PORT=8000
FRONTEND_PORT=3000
EOF

# Start all services
docker-compose up -d

# Wait for services to be healthy
sleep 30

# Check status
docker-compose ps
```

### 2. Run Database Migrations

```bash
# Access backend container
docker-compose exec backend bash

# Run Alembic migrations
cd /app
export DATABASE_URL="postgresql://rw_user:your_secure_db_password@postgres:5432/research_workspace"
alembic upgrade head

# Exit container
exit
```

### 3. Verify Services Are Running

```bash
# Backend health check
curl http://localhost:8000/database/health

# Frontend (if running with frontend profile)
docker-compose --profile frontend up -d
curl http://localhost:3000

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Full Testing Workflow

Run the complete integration test suite:

```bash
# From repository root
python scripts/integration_tests.py \
  --backend-url http://localhost:8000 \
  --frontend-url http://localhost:3000 \
  --verbose \
  --junit-output test-results.xml
```

## Manual Testing Checklist

### 1. Authentication Flow
```bash
# Start at login page
# Should be redirected to OIDC provider or dev login
# After login, should have auth token in localStorage: rw-auth-token
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/auth/me
```

### 2. Create Project
```bash
PROJECT_ID="proj-$(date +%s)"
curl -X POST http://localhost:8000/api/v1/manuscripts/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$PROJECT_ID\",\"title\":\"Test Project\",\"description\":\"Integration test\"}"
```

### 3. Create Paper
```bash
curl -X POST http://localhost:8000/api/v1/manuscripts/papers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\":\"Sample Paper\",
    \"authors\":[\"Author One\"],
    \"year\":2024,
    \"journal\":\"Nature\",
    \"project_id\":\"$PROJECT_ID\"
  }"
```

### 4. Create Document
```bash
curl -X POST http://localhost:8000/api/v1/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\":\"Test Document\",
    \"description\":\"Integration test document\",
    \"status\":\"draft\",
    \"permission\":\"private\",
    \"tags\":[\"test\"]
  }"
```

### 5. Search
```bash
curl "http://localhost:8000/api/v1/documents/search?q=test" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Delete (Soft Delete)
```bash
curl -X DELETE http://localhost:8000/api/v1/documents/DOCUMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Check Activity Audit (Admin)
```bash
curl "http://localhost:8000/api/v1/admin/activity/events" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Monitoring & Logs

### Backend Logs
```bash
# Real-time logs
docker-compose logs -f backend

# Filter by level
docker-compose exec backend grep "ERROR\|WARN" logs/app_*.log
```

### Database Logs
```bash
# Check PostgreSQL logs
docker-compose exec postgres psql -U rw_user -d research_workspace -c "SELECT * FROM activity_events LIMIT 10;"
```

### Performance Metrics
```bash
# Check API response times from logs
docker-compose logs backend | grep "duration_ms"

# P95 latency (example)
# duration_ms should be < 100ms for most endpoints
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Verify ports are available
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Kill existing containers
docker-compose down
```

### Database connection fails
```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection manually
docker-compose exec postgres psql -U rw_user -d research_workspace -c "SELECT version();"
```

### Frontend can't reach backend
```bash
# Check CORS configuration on backend
curl -i http://localhost:8000/api/v1/auth/me

# Verify API base URL in frontend
# Should be http://localhost:8000 or VITE_API_BASE_URL
```

### Permission denied errors
```bash
# Check if auth token is valid
curl -i -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/auth/me

# Token expiration
iat=$(echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .exp)
```

## Environment Variables

### Backend (.env.staging)
```
DATABASE_URL=postgresql://rw_user:password@postgres:5432/research_workspace
REDIS_URL=redis://redis:6379/0
ENVIRONMENT=staging
DEBUG=true
ADMIN_USER_EMAIL=admin@local.test
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_LOCAL_FALLBACK=false
```

## Clean Shutdown

```bash
# Stop all services
docker-compose down

# Remove data volumes (reset database)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## CI/CD Integration

This docker-compose setup can be used in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Start Services
  run: docker-compose up -d

- name: Wait for Services
  run: sleep 30

- name: Run Tests
  run: python scripts/integration_tests.py

- name: Collect Logs
  if: failure()
  run: docker-compose logs > test-logs.txt

- name: Upload Logs
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: docker-logs
    path: test-logs.txt
```

## Performance Benchmarking

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/auth/me

# Using wrk
wrk -t4 -c100 -d30s http://localhost:8000/api/v1/auth/me
```

### Expected Performance Targets
- Auth endpoints: < 50ms (P95)
- Document operations: < 100ms (P95)
- Search: < 200ms (P95)
- List operations: < 150ms (P95)

## Next Steps

1. ✓ Staging environment setup
2. Run integration tests with actual data
3. Performance testing and optimization
4. Production deployment

## Getting Help

For issues or questions:
1. Check docker-compose logs: `docker-compose logs`
2. Verify all services are healthy: `docker-compose ps`
3. Test individual endpoints with curl
4. Check backend README.md for API documentation

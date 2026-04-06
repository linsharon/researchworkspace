# PostgreSQL Migration Guide

This guide explains how to migrate from SQLite to PostgreSQL for production deployment.

## Prerequisites

1. **PostgreSQL Server**: Ensure PostgreSQL is installed and running
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   ```

2. **Python Dependencies**: Install required packages
   ```bash
   pip install -r requirements.txt
   ```

## Migration Steps

### 1. Verify PostgreSQL Installation

```bash
# Check PostgreSQL version
psql --version

# Start PostgreSQL service (if not already running)
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

### 2. Run Migration Script

```bash
# Set PostgreSQL admin password
export POSTGRES_PASSWORD=<admin_password>

# Run migration with database and user creation
cd app/backend
python scripts/migrate_to_postgresql.py --create-db --create-user

# Optional: Specify custom host/port
python scripts/migrate_to_postgresql.py \
  --create-db \
  --create-user \
  --host localhost \
  --port 5432 \
  --db-name research_workspace \
  --db-user rw_user
```

### 3. Verify Connection

The migration script will automatically:
- Create the PostgreSQL database
- Create the application user
- Run all Alembic migrations to establish schema
- Save configuration to `.env` file
- Verify the connection

### 4. Update Application Configuration

The `.env` file will be automatically updated with:
```
DATABASE_URL=postgresql://rw_user:...@localhost:5432/research_workspace
DATABASE_USER=rw_user
DATABASE_NAME=research_workspace
```

### 5. Restart Backend Application

```bash
# Activate virtual environment
source .venv/bin/activate

# Start backend with PostgreSQL
python main.py
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL admin password (required) | - |
| `POSTGRES_HOST` | PostgreSQL host | localhost |
| `POSTGRES_PORT` | PostgreSQL port | 5432 |
| `POSTGRES_USER` | PostgreSQL admin user | postgres |
| `DB_NAME` | Target database name | research_workspace |
| `DB_USER` | Target database user | rw_user |
| `DB_PASSWORD` | Target database password | Auto-generated |

## Advanced: Manual Migration

If the automated script doesn't work, you can manually execute the steps:

### 1. Create PostgreSQL User and Database

```bash
sudo -u postgres psql
```

```sql
-- Create user
CREATE USER rw_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Create database
CREATE DATABASE research_workspace OWNER rw_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE research_workspace TO rw_user;
\q
```

### 2. Run Alembic Migrations

```bash
export DATABASE_URL="postgresql://rw_user:your_secure_password@localhost:5432/research_workspace"
alembic upgrade head
```

### 3. Verify Schema

```bash
psql -U rw_user -d research_workspace -c "\dt"
```

## Data Migration from SQLite

If you have existing data in SQLite that needs to be migrated:

### Option 1: Using pg_dump and SQLite export

```bash
# Export from SQLite
sqlite3 app.db ".dump" > sqlite_dump.sql

# Manual table migration (requires schema mapping)
# This is application-specific and should be handled separately
```

### Option 2: Application-level migration

Create a Python script to:
1. Read data from SQLite (`sqlite+aiosqlite:///./app.db`)
2. Write data to PostgreSQL
3. Handle data type conversions

Example structure:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Source: SQLite
sqlite_engine = create_engine("sqlite:///app.db")
SQLiteSession = sessionmaker(bind=sqlite_engine)

# Target: PostgreSQL  
pg_engine = create_engine("postgresql://rw_user:...@localhost/research_workspace")
PGSession = sessionmaker(bind=pg_engine)

# Migrate table by table
```

## Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Authentication Failed
```bash
# Verify user exists
sudo -u postgres psql -c "SELECT * FROM pg_user WHERE usename = 'rw_user';"

# Reset user password
sudo -u postgres psql -c "ALTER USER rw_user WITH ENCRYPTED PASSWORD 'new_password';"
```

### Migration Failed
```bash
# Check Alembic status
alembic current
alembic history

# Manually run specific migration
alembic upgrade <revision>
```

### Database Already Exists
The script safely checks for existing databases/users before creating them.

```bash
# Drop existing database (WARNING: Data loss!)
sudo -u postgres psql -c "DROP DATABASE research_workspace;"

# Or migrate to a different database name
python scripts/migrate_to_postgresql.py --create-db --create-user --db-name rw_prod
```

## Production Deployment

For production deployment:

1. **Use managed PostgreSQL** (RDS, Cloud SQL, Azure Database, etc.)
   - More reliable and easier to manage
   - Automatic backups and failover

2. **Configure connection pooling**
   - Use PgBouncer or similar
   - Add `pgbouncer.ini` configuration

3. **Enable SSL/TLS**
   - Update `DATABASE_URL` to use `postgresql+asyncpg://...?ssl=require`

4. **Set up monitoring**
   - Monitor query performance
   - Set up slow query logging
   - Configure alerts for connection pool exhaustion

## Rollback to SQLite

If you need to revert to SQLite:

```bash
# Update .env
DATABASE_URL=sqlite+aiosqlite:///./app.db

# Run migrations in reverse (if needed)
alembic downgrade base
```

## Next Steps

1. ✓ Migrate to PostgreSQL
2. Add Redis for session management and caching
3. Configure pg_partman for time-series data partitioning
4. Set up Read Replicas for high availability
5. Implement connection pooling (PgBouncer)
6. Add monitoring and alerting

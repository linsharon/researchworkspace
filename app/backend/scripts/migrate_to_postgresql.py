#!/usr/bin/env python3
"""
PostgreSQL Migration Script

This script handles the migration from SQLite to PostgreSQL:
1. Creates PostgreSQL database and user if they don't exist
2. Runs Alembic migrations to establish schema
3. Optionally migrates data from SQLite to PostgreSQL

Usage:
    python migrate_to_postgresql.py --create-db --create-user [--migrate-data]

Environment Variables:
    POSTGRES_HOST: PostgreSQL host (default: localhost)
    POSTGRES_PORT: PostgreSQL port (default: 5432)
    POSTGRES_USER: PostgreSQL admin user (default: postgres)
    POSTGRES_PASSWORD: PostgreSQL admin password (required)
    DB_NAME: Target database name (default: research_workspace)
    DB_USER: Target database user (default: rw_user)
    DB_PASSWORD: Target database password (required or auto-generate)
"""

import os
import sys
import subprocess
import asyncio
import logging
from pathlib import Path
from typing import Optional
import argparse
import psycopg2
from psycopg2 import sql
import secrets
import string

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class PostgreSQLMigrator:
    """Handle PostgreSQL migration tasks."""

    def __init__(
        self,
        admin_password: str,
        host: str = "localhost",
        port: int = 5432,
        admin_user: str = "postgres",
        db_name: str = "research_workspace",
        db_user: str = "rw_user",
        db_password: Optional[str] = None,
    ):
        self.admin_password = admin_password
        self.host = host
        self.port = port
        self.admin_user = admin_user
        self.db_name = db_name
        self.db_user = db_user
        self.db_password = db_password or self._generate_secure_password()

    @staticmethod
    def _generate_secure_password(length: int = 32) -> str:
        """Generate a secure random password."""
        chars = string.ascii_letters + string.digits + string.punctuation
        # Avoid problematic characters in passwords
        safe_chars = "".join(c for c in chars if c not in "'\"`\\")
        return "".join(secrets.choice(safe_chars) for _ in range(length))

    def connect_as_admin(self):
        """Connect to PostgreSQL as admin."""
        try:
            conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.admin_user,
                password=self.admin_password,
                database="postgres",
            )
            conn.autocommit = True
            return conn
        except psycopg2.OperationalError as e:
            logger.error(f"Failed to connect to PostgreSQL as admin: {e}")
            raise

    def create_database(self) -> bool:
        """Create the target database if it doesn't exist."""
        try:
            conn = self.connect_as_admin()
            cursor = conn.cursor()

            # Check if database exists
            cursor.execute(
                sql.SQL("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s"),
                [self.db_name],
            )
            if cursor.fetchone():
                logger.info(f"Database '{self.db_name}' already exists")
                cursor.close()
                conn.close()
                return True

            # Create database
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(self.db_name)))
            logger.info(f"Database '{self.db_name}' created successfully")

            cursor.close()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error creating database: {e}")
            raise

    def create_db_user(self) -> bool:
        """Create the database user if they don't exist."""
        try:
            conn = self.connect_as_admin()
            cursor = conn.cursor()

            # Check if user exists
            cursor.execute(sql.SQL("SELECT 1 FROM pg_catalog.pg_user WHERE usename = %s"), [self.db_user])
            if cursor.fetchone():
                logger.info(f"User '{self.db_user}' already exists")
                cursor.close()
                conn.close()
                return True

            # Create user
            cursor.execute(
                sql.SQL("CREATE USER {} WITH ENCRYPTED PASSWORD %s").format(sql.Identifier(self.db_user)),
                [self.db_password],
            )
            logger.info(f"User '{self.db_user}' created successfully")

            # Grant privileges
            cursor.execute(
                sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}").format(
                    sql.Identifier(self.db_name),
                    sql.Identifier(self.db_user),
                )
            )
            logger.info(f"Privileges granted to '{self.db_user}'")

            cursor.close()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise

    def run_migrations(self) -> bool:
        """Run Alembic migrations."""
        try:
            # Set DATABASE_URL for Alembic
            db_url = f"postgresql://{self.db_user}:{self.db_password}@{self.host}:{self.port}/{self.db_name}"
            env = os.environ.copy()
            env["DATABASE_URL"] = db_url

            # Get the backend directory
            backend_dir = Path(__file__).parent.parent

            # Run Alembic upgrade
            logger.info("Running Alembic migrations...")
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                cwd=str(backend_dir),
                env=env,
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                logger.error(f"Alembic migration failed: {result.stderr}")
                return False

            logger.info("Migrations completed successfully")
            return True
        except Exception as e:
            logger.error(f"Error running migrations: {e}")
            raise

    def save_env_config(self, env_file: Optional[Path] = None) -> bool:
        """Save PostgreSQL configuration to .env file."""
        try:
            if env_file is None:
                env_file = Path(__file__).parent.parent / ".env"

            db_url = f"postgresql://{self.db_user}:{self.db_password}@{self.host}:{self.port}/{self.db_name}"

            # Read existing env file
            env_vars = {}
            if env_file.exists():
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, value = line.split("=", 1)
                            env_vars[key.strip()] = value.strip()

            # Update DATABASE_URL
            env_vars["DATABASE_URL"] = db_url
            env_vars["DATABASE_USER"] = self.db_user
            env_vars["DATABASE_NAME"] = self.db_name

            # Write updated env file
            with open(env_file, "w", encoding="utf-8") as f:
                for key, value in env_vars.items():
                    f.write(f"{key}={value}\n")

            logger.info(f"Configuration saved to {env_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving configuration: {e}")
            raise

    def verify_connection(self) -> bool:
        """Verify the connection to the new PostgreSQL database."""
        try:
            conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.db_user,
                password=self.db_password,
                database=self.db_name,
            )
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            logger.info(f"Connected to PostgreSQL: {version[0]}")
            cursor.close()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Failed to verify connection: {e}")
            return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Migrate to PostgreSQL")
    parser.add_argument("--create-db", action="store_true", help="Create the database")
    parser.add_argument("--create-user", action="store_true", help="Create the database user")
    parser.add_argument("--host", default="localhost", help="PostgreSQL host")
    parser.add_argument("--port", type=int, default=5432, help="PostgreSQL port")
    parser.add_argument("--admin-user", default="postgres", help="PostgreSQL admin user")
    parser.add_argument("--db-name", default="research_workspace", help="Target database name")
    parser.add_argument("--db-user", default="rw_user", help="Target database user")
    parser.add_argument("--db-password", help="Target database password (auto-generate if not provided)")

    args = parser.parse_args()

    # Get admin password from environment or input
    admin_password = os.environ.get("POSTGRES_PASSWORD")
    if not admin_password:
        print("Error: POSTGRES_PASSWORD environment variable is required")
        print("Usage: POSTGRES_PASSWORD=... python migrate_to_postgresql.py")
        sys.exit(1)

    try:
        migrator = PostgreSQLMigrator(
            admin_password=admin_password,
            host=args.host,
            port=args.port,
            admin_user=args.admin_user,
            db_name=args.db_name,
            db_user=args.db_user,
            db_password=args.db_password,
        )

        logger.info(f"Starting PostgreSQL migration to {args.host}:{args.port}/{args.db_name}")

        if args.create_db:
            logger.info("Creating database...")
            migrator.create_database()

        if args.create_user:
            logger.info("Creating user...")
            migrator.create_db_user()

        logger.info("Running migrations...")
        if not migrator.run_migrations():
            sys.exit(1)

        logger.info("Saving configuration...")
        migrator.save_env_config()

        logger.info("Verifying connection...")
        if migrator.verify_connection():
            logger.info("✓ PostgreSQL migration completed successfully!")
            logger.info(f"Generated DB user password: {migrator.db_password}")
            logger.info(f"Update your .env file with DATABASE_URL or use the saved configuration")
        else:
            logger.error("✗ Connection verification failed")
            sys.exit(1)

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

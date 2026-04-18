"""
Startup migration script.

Handles the case where the production database already has tables created
via SQLAlchemy create_all (no alembic_version record), by stamping to the
last known good revision before running upgrade head.

LAST_PRE_EXISTING_REVISION must be the revision ID that corresponds to the
state of the DB *before* any new migrations we want to apply.
"""
import subprocess
import sys

# The revision just before our new migration (add_user_is_premium).
# All tables up to and including this revision already exist in production.
LAST_PRE_EXISTING_REVISION = "1a2b3c4d5e6f"


def run(cmd: list[str]) -> tuple[int, str]:
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout, end="")
    print(result.stderr, end="", file=sys.stderr)
    return result.returncode, result.stdout + result.stderr


def main():
    # Check current alembic version
    code, output = run([sys.executable, "-m", "alembic", "current"])
    if code != 0:
        print("ERROR: could not determine alembic current version", file=sys.stderr)
        sys.exit(1)

    # If not already at head, the DB was likely created via create_all without
    # running migrations (alembic_version table may be missing or stale).
    # Stamp to align before upgrading.
    if "(head)" not in output:
        print(f"Not at head. Stamping to {LAST_PRE_EXISTING_REVISION}...")
        code, _ = run([sys.executable, "-m", "alembic", "stamp", LAST_PRE_EXISTING_REVISION])
        if code != 0:
            print("ERROR: alembic stamp failed", file=sys.stderr)
            sys.exit(1)

    # Run upgrade to head
    print("Running alembic upgrade head...")
    code, _ = run([sys.executable, "-m", "alembic", "upgrade", "head"])
    if code != 0:
        print("ERROR: alembic upgrade head failed", file=sys.stderr)
        sys.exit(1)

    print("Migration complete.")


if __name__ == "__main__":
    main()

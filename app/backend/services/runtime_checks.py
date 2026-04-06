import logging

from core.config import settings

logger = logging.getLogger(__name__)


def validate_runtime_configuration() -> None:
    """Fail-fast checks for production-like environments."""
    env = (settings.environment or "development").strip().lower()
    production_like = env in {"prod", "production"}

    errors: list[str] = []
    warnings: list[str] = []

    if production_like:
        if settings.debug:
            errors.append("DEBUG must be false in production")

        if settings.jwt_secret_key == "dev-secret-key-change-in-production":
            errors.append("JWT_SECRET_KEY must be overridden in production")

        if settings.database_url.startswith("sqlite"):
            errors.append("Production must not use sqlite database")

        if settings.frontend_url.startswith("http://"):
            warnings.append("FRONTEND_URL is using http in production; https is recommended")

        if not settings.cors_allow_origin_list:
            errors.append("CORS_ALLOW_ORIGINS must be explicitly configured in production")

        if "*" in settings.cors_allow_origin_list:
            errors.append("CORS_ALLOW_ORIGINS must not include '*' in production")

    for message in warnings:
        logger.warning("[runtime-check] %s", message)

    if errors:
        combined = "; ".join(errors)
        logger.error("[runtime-check] configuration invalid: %s", combined)
        raise RuntimeError(f"Runtime configuration invalid: {combined}")

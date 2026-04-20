import logging
import os
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode, urlparse

import httpx
from core.auth import (
    IDTokenValidationError,
    build_authorization_url,
    build_logout_url,
    generate_code_challenge,
    generate_code_verifier,
    generate_nonce,
    generate_state,
    validate_id_token,
)
from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from models.auth import User
from schemas.auth import (
    AuthTokenResponse,
    PasswordLoginRequest,
    PlatformTokenExchangeRequest,
    RegisterRequest,
    TokenExchangeResponse,
    UserResponse,
)
from services.auth import AuthService, apply_system_user_flags
from services.password_auth import hash_password, verify_password
from services.user import UserService
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


def _local_patch(url: str) -> str:
    """Patch URL for local development."""
    if os.getenv("LOCAL_PATCH", "").lower() not in ("true", "1"):
        return url

    patched_url = url.replace("https://", "http://").replace(":8000", ":3000")
    logger.debug("[get_dynamic_backend_url] patching URL from %s to %s", url, patched_url)
    return patched_url


def get_dynamic_backend_url(request: Request) -> str:
    """Get backend URL dynamically from request headers."""
    mgx_external_domain = request.headers.get("mgx-external-domain")
    x_forwarded_host = request.headers.get("x-forwarded-host")
    host = request.headers.get("host")
    scheme = request.headers.get("x-forwarded-proto", "https")

    effective_host = mgx_external_domain or x_forwarded_host or host
    if not effective_host:
        logger.warning("[get_dynamic_backend_url] No host found, fallback to %s", settings.backend_url)
        return settings.backend_url

    dynamic_url = _local_patch(f"{scheme}://{effective_host}")
    logger.debug(
        "[get_dynamic_backend_url] mgx-external-domain=%s, x-forwarded-host=%s, host=%s, scheme=%s, dynamic_url=%s",
        mgx_external_domain,
        x_forwarded_host,
        host,
        scheme,
        dynamic_url,
    )
    return dynamic_url


def derive_name_from_email(email: str) -> str:
    return email.split("@", 1)[0] if email else ""


def is_oidc_configured() -> bool:
    return bool(settings.oidc_client_id and settings.oidc_client_secret and settings.oidc_issuer_url)


def is_dev_auth_fallback_enabled() -> bool:
    explicit_flag = os.getenv("ENABLE_DEV_AUTH_FALLBACK", "").lower()
    if explicit_flag in ("true", "1", "yes", "on"):
        return True
    if explicit_flag in ("false", "0", "no", "off"):
        return False
    environment = os.getenv("ENVIRONMENT", "").lower()
    return bool(settings.debug or environment in {"dev", "development", "local"})


def get_frontend_base_url(request: Request) -> str:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")

    referer = request.headers.get("referer")
    if referer:
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"

    if settings.frontend_url:
        return settings.frontend_url.rstrip("/")

    return get_dynamic_backend_url(request)


async def perform_dev_login(request: Request, db: AsyncSession) -> RedirectResponse:
    auth_service = AuthService(db)

    dev_user_id = request.query_params.get("user_id") or os.getenv("DEV_AUTH_USER_ID", "dev-user")
    dev_user_email = request.query_params.get("email") or os.getenv("DEV_AUTH_USER_EMAIL", "dev.user@example.com")
    dev_user_name = request.query_params.get("name") or os.getenv("DEV_AUTH_USER_NAME", "Dev User")
    dev_user_role = request.query_params.get("role") or os.getenv("DEV_AUTH_USER_ROLE", "admin")

    user = await auth_service.get_or_create_user(
        platform_sub=dev_user_id,
        email=dev_user_email,
        name=dev_user_name,
    )
    if dev_user_role and user.role != dev_user_role:
        user.role = dev_user_role
        await db.commit()
        await db.refresh(user)

    app_token, expires_at, _ = await auth_service.issue_app_token(user=user)
    fragment = urlencode(
        {
            "token": app_token,
            "expires_at": int(expires_at.timestamp()),
            "token_type": "Bearer",
        }
    )

    frontend_base = get_frontend_base_url(request)
    redirect_url = f"{frontend_base}/auth/callback?{fragment}"
    logger.warning("[login] OIDC is not configured; using development auth fallback for user=%s", dev_user_id)
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.post("/register", response_model=AuthTokenResponse, status_code=201)
async def register_with_email_password(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password
    name = payload.name.strip() if payload.name else None

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing_result = await db.execute(select(User).where(func.lower(User.email) == email))
    existing_user = existing_result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")

    auth_service = AuthService(db)
    user = await auth_service.get_or_create_user(
        platform_sub=f"local-{os.urandom(8).hex()}",
        email=email,
        name=name or derive_name_from_email(email),
    )
    user.password_hash = hash_password(password)
    user.role = "user"
    user.is_premium = False
    apply_system_user_flags(user)
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    token, expires_at, _ = await auth_service.issue_app_token(user=user)
    return AuthTokenResponse(
        token=token,
        expires_at=int(expires_at.timestamp()),
        user=UserResponse.model_validate(user),
    )


@router.post("/login/password", response_model=AuthTokenResponse)
async def login_with_email_password(payload: PasswordLoginRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    auth_service = AuthService(db)
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    token, expires_at, _ = await auth_service.issue_app_token(user=user)
    return AuthTokenResponse(
        token=token,
        expires_at=int(expires_at.timestamp()),
        user=UserResponse.model_validate(user),
    )


@router.get("/login")
async def login(request: Request, db: AsyncSession = Depends(get_db)):
    """Start OIDC login flow with PKCE."""
    if not is_oidc_configured():
        if not is_dev_auth_fallback_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OIDC login is not configured. Set OIDC_CLIENT_ID, OIDC_CLIENT_SECRET and OIDC_ISSUER_URL.",
            )
        return await perform_dev_login(request, db)

    state = generate_state()
    nonce = generate_nonce()
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)

    auth_service = AuthService(db)
    await auth_service.store_oidc_state(state, nonce, code_verifier)

    backend_url = get_dynamic_backend_url(request)
    redirect_uri = f"{backend_url}/api/v1/auth/callback"
    logger.info("[login] Starting OIDC flow with redirect_uri=%s", redirect_uri)

    auth_url = build_authorization_url(state, nonce, code_challenge, redirect_uri=redirect_uri)
    return RedirectResponse(
        url=auth_url,
        status_code=status.HTTP_302_FOUND,
        headers={"X-Request-ID": state},
    )


@router.get("/callback")
async def callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle OIDC callback."""
    backend_url = get_dynamic_backend_url(request)

    def redirect_with_error(message: str) -> RedirectResponse:
        fragment = urlencode({"msg": message})
        return RedirectResponse(url=f"{backend_url}/auth/error?{fragment}", status_code=status.HTTP_302_FOUND)

    if error:
        return redirect_with_error(f"OIDC error: {error}")

    if not code or not state:
        return redirect_with_error("Missing code or state parameter")

    auth_service = AuthService(db)
    temp_data = await auth_service.get_and_delete_oidc_state(state)
    if not temp_data:
        return redirect_with_error("Invalid or expired state parameter")

    nonce = temp_data["nonce"]
    code_verifier = temp_data.get("code_verifier")

    try:
        redirect_uri = f"{backend_url}/api/v1/auth/callback"
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": settings.oidc_client_id,
            "client_secret": settings.oidc_client_secret,
        }
        if code_verifier:
            token_data["code_verifier"] = code_verifier

        token_url = f"{settings.oidc_issuer_url}/token"
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                token_url,
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded", "X-Request-ID": state},
            )

        if token_response.status_code != 200:
            return redirect_with_error(f"Token exchange failed: {token_response.text}")

        tokens = token_response.json()
        id_token = tokens.get("id_token")
        if not id_token:
            return redirect_with_error("No ID token received")

        id_claims = await validate_id_token(id_token)
        if id_claims.get("nonce") != nonce:
            return redirect_with_error("Invalid nonce")

        email = id_claims.get("email", "")
        name = id_claims.get("name") or derive_name_from_email(email)
        user = await auth_service.get_or_create_user(platform_sub=id_claims["sub"], email=email, name=name)
        user.last_login = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)

        app_token, expires_at, _ = await auth_service.issue_app_token(user=user)

        fragment = urlencode(
            {
                "token": app_token,
                "expires_at": int(expires_at.timestamp()),
                "token_type": "Bearer",
            }
        )

        redirect_url = f"{backend_url}/auth/callback?{fragment}"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)

    except IDTokenValidationError as e:
        return redirect_with_error(f"Authentication failed: {e.message}")
    except HTTPException as e:
        return redirect_with_error(str(e.detail))
    except Exception as e:
        logger.exception("Unexpected error in OIDC callback: %s", e)
        return redirect_with_error(
            "Authentication processing failed. Please try again or contact support if the issue persists."
        )


@router.post("/token/exchange", response_model=TokenExchangeResponse)
async def exchange_platform_token(payload: PlatformTokenExchangeRequest, db: AsyncSession = Depends(get_db)):
    """Exchange Platform token for app token, restricted to admin user."""
    verify_url = f"{settings.oidc_issuer_url}/platform/tokens/verify"

    try:
        async with httpx.AsyncClient() as client:
            verify_response = await client.post(
                verify_url,
                json={"platform_token": payload.platform_token},
                headers={"Content-Type": "application/json"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to verify platform token") from exc

    try:
        verify_body = verify_response.json()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from platform token verification service",
        )

    if not isinstance(verify_body, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unexpected response from platform token verification service",
        )

    if verify_response.status_code != status.HTTP_200_OK or not verify_body.get("success"):
        message = verify_body.get("message", "") if isinstance(verify_body, dict) else ""
        raise HTTPException(
            status_code=verify_response.status_code,
            detail=message or "Platform token verification failed",
        )

    payload_data = verify_body.get("data") or {}
    raw_user_id = payload_data.get("user_id")

    if not raw_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Platform token payload missing user_id")

    platform_user_id = str(raw_user_id)
    if platform_user_id != str(settings.admin_user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin user can exchange a platform token")

    auth_service = AuthService(db)

    admin_email = payload_data.get("email", "") or getattr(settings, "admin_user_email", "")
    admin_name = payload_data.get("name") or payload_data.get("username")
    if not admin_name:
        admin_name = derive_name_from_email(admin_email)

    user = await auth_service.get_or_create_user(
        platform_sub=platform_user_id,
        email=admin_email,
        name=admin_name,
    )
    user.role = "admin"
    user.is_premium = True
    apply_system_user_flags(user)
    await db.commit()
    await db.refresh(user)
    app_token, _expires_at, _ = await auth_service.issue_app_token(user=user)

    return TokenExchangeResponse(token=app_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user info."""
    profile = await UserService.get_user_profile(db, current_user.id)
    if not profile:
        return current_user
    return UserResponse.model_validate(profile)


@router.get("/logout")
async def logout(
    request: Request,
    local_only: bool = Query(default=True),
):
    """Logout user.

    - local_only=true (default): local app logout only; keeps IdP/browser account sessions intact.
    - local_only=false: perform IdP logout redirect.
    """
    frontend_base = get_frontend_base_url(request)

    if local_only or not is_oidc_configured():
        return {"redirect_url": frontend_base or "/"}

    logout_url = build_logout_url()
    return {"redirect_url": logout_url}

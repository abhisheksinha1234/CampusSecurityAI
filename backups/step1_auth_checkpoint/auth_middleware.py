"""
Authentication Middleware, Session Management, and Role-Based Access Control (RBAC).

Features:
  - Cryptographically secure session tokens (secrets.token_urlsafe).
  - Session TTL expiration (24 hours).
  - Dual extraction: Authorization: Bearer <token> AND HttpOnly SameSite cookie ("access_token").
  - RBAC verification via require_role(["ADMIN", ...]).
  - Server-side session invalidation on logout.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Callable

from fastapi import Depends, HTTPException, Request, Response, status
from dotenv import load_dotenv

load_dotenv()

# In-memory session store
# { token_str: { "user": { ... }, "created_at": datetime, "expires_at": datetime } }
SESSION_STORE: Dict[str, Dict[str, Any]] = {}

SESSION_LIFETIME_HOURS = 24
COOKIE_NAME = "access_token"
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"


def create_session(user_profile: dict) -> str:
    """
    Creates a new cryptographic session token for the user profile,
    stores it with an expiry timestamp, and returns the token string.
    """
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    SESSION_STORE[token] = {
        "user": user_profile,
        "created_at": now.isoformat(),
        "expires_at": now + timedelta(hours=SESSION_LIFETIME_HOURS),
    }
    return token


def invalidate_session(token: str) -> bool:
    """Removes a session token from the store. Returns True if found and removed."""
    return SESSION_STORE.pop(token, None) is not None


def set_session_cookie(response: Response, token: str) -> None:
    """
    Sets a secure session cookie on the outgoing HTTP response.
    - HttpOnly: Prevents client-side scripts from reading the cookie (mitigates XSS).
    - SameSite='lax': Protects against CSRF in cross-site requests.
    - Secure: Transmitted only over HTTPS when in production.
    """
    max_age_seconds = SESSION_LIFETIME_HOURS * 3600
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=max_age_seconds,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    """Clears the session cookie on logout."""
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
        path="/",
    )


def resolve_token(request: Request) -> Optional[str]:
    """
    Extracts session token from either:
    1. Authorization: Bearer <token> header
    2. HttpOnly Cookie: access_token
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    # Fallback to cookie
    cookie_token = request.cookies.get(COOKIE_NAME)
    if cookie_token:
        return cookie_token.strip()

    return None


def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency validating the caller's session token.
    Returns the user profile dict.
    Raises 401 UNAUTHORIZED if missing, invalid, or expired.
    """
    token = resolve_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = SESSION_STORE.get(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if datetime.now(timezone.utc) > session["expires_at"]:
        SESSION_STORE.pop(token, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return session["user"]


def require_role(allowed_roles: List[str]) -> Callable:
    """
    Returns a FastAPI dependency that checks the authenticated user's role.
    Raises 403 FORBIDDEN if the role is not in allowed_roles.
    """
    def _role_checker(user: dict = Depends(get_current_user)) -> dict:
        user_role = user.get("role", "")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Insufficient permissions. Role '{user_role}' is not authorized. "
                    f"Required: {allowed_roles}."
                ),
            )
        return user
    return _role_checker

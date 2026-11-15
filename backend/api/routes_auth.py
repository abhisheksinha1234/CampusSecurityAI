"""
Authentication and Role-Based Access Control (RBAC) API Endpoints.
Supports Administrator (Chief Security Officer), Patrol Officer, and Campus Viewer roles.
Includes Email OTP Two-Factor Authentication via Gmail.

SECURITY ENHANCEMENTS:
  - Passwords hashed with bcrypt.
  - Cryptographically secure session management.
  - HttpOnly, SameSite, Secure cookie support.
  - Zero password or secret exposure in any response.
  - Resend cooldowns and attempt rate limits.
"""

import os
from typing import Optional, List, Dict, Any

import bcrypt
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel, Field

from backend.api.otp_service import generate_otp, store_otp, send_otp_email, verify_otp
from backend.api.auth_middleware import (
    create_session,
    invalidate_session,
    set_session_cookie,
    clear_session_cookie,
    get_current_user,
    resolve_token,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# Password hashing helpers (bcrypt)
# ---------------------------------------------------------------------------
def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Predefined Demonstration Accounts (Hashed passwords)
# ---------------------------------------------------------------------------
def _init_demo_users() -> Dict[str, Dict[str, Any]]:
    raw = {
        "admin": {
            "user_id": "USR-ADMIN-01",
            "username": "admin",
            "plain_password": "lpu@security2026",
            "full_name": "CSO Vikramaditya Singh",
            "role": "ADMIN",
            "designation": "Chief Security Officer (HQ)",
            "badge_number": "LPU-SEC-001",
            "permissions": [
                "PLAN_PATROL",
                "APPROVE_PATROL",
                "REJECT_PATROL",
                "SIMULATE_SCENARIOS",
                "MANAGE_ZONES",
                "TOGGLE_WALKWAYS",
                "VIEW_ANALYTICS",
            ],
        },
        "officer": {
            "user_id": "USR-GUARD-08",
            "username": "officer",
            "plain_password": "patrol@lpu",
            "full_name": "Guard Harpreet Kaur",
            "role": "PATROL_OFFICER",
            "designation": "Field Patrol Supervisor (Sector 2)",
            "badge_number": "LPU-SEC-084",
            "permissions": [
                "VIEW_PATROL",
                "REPORT_INCIDENT",
                "VIEW_MAP",
                "VIEW_RISK",
            ],
        },
        "viewer": {
            "user_id": "USR-VIEW-03",
            "username": "viewer",
            "plain_password": "lpu@guest",
            "full_name": "Prof. Amanjot Verma",
            "role": "VIEWER",
            "designation": "Campus Safety Observer",
            "badge_number": "LPU-FAC-219",
            "permissions": [
                "VIEW_MAP",
                "VIEW_RISK",
            ],
        },
    }

    users: Dict[str, Dict[str, Any]] = {}
    for k, v in raw.items():
        pwd = v.pop("plain_password")
        v["password_hash"] = _hash_password(pwd)
        users[k] = v
    return users


DEMO_USERS: Dict[str, Dict[str, Any]] = _init_demo_users()


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str = Field(..., description="Username: admin, officer, or viewer")
    password: str = Field(..., description="Password")


class SendOtpRequest(BaseModel):
    email: str = Field(..., description="Recipient personal Gmail address for OTP delivery")
    role: str = Field("ADMIN", description="ADMIN or PATROL_OFFICER")
    username: Optional[str] = "admin"


class VerifyOtpRequest(BaseModel):
    email: str = Field(..., description="Recipient email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    role: str = Field("ADMIN", description="ADMIN or PATROL_OFFICER")
    username: Optional[str] = "admin"


class UserProfile(BaseModel):
    user_id: str
    username: str
    full_name: str
    role: str
    designation: str
    badge_number: str
    permissions: List[str]


class LoginResponse(BaseModel):
    status: str
    message: str
    token: str
    user: UserProfile


def _safe_profile(user_dict: Dict[str, Any]) -> dict:
    return {
        "user_id": user_dict["user_id"],
        "username": user_dict["username"],
        "full_name": user_dict["full_name"],
        "role": user_dict["role"],
        "designation": user_dict["designation"],
        "badge_number": user_dict["badge_number"],
        "permissions": user_dict["permissions"],
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest, response: Response):
    """
    Authenticates security personnel or campus viewers with password.
    Sets secure HttpOnly session cookie and returns session token.
    """
    uname = credentials.username.strip().lower()
    user_record = DEMO_USERS.get(uname)

    if not user_record or not _verify_password(credentials.password, user_record["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password.",
        )

    profile = _safe_profile(user_record)
    token = create_session(profile)
    set_session_cookie(response, token)

    return LoginResponse(
        status="SUCCESS",
        message=f"Welcome back, {profile['full_name']} ({profile['role']})",
        token=token,
        user=UserProfile(**profile),
    )


@router.post("/otp/send")
def send_otp(req: SendOtpRequest):
    """
    Generates a 6-digit OTP and dispatches it to user's Gmail address via SMTP.
    Enforces cooldown and never leaks the OTP in the API response.
    """
    clean_email = req.email.strip().lower()
    if "@" not in clean_email or "." not in clean_email:
        raise HTTPException(status_code=400, detail="Please provide a valid Gmail address.")

    role_key = "admin" if req.role.upper() == "ADMIN" else "officer"
    user_record = DEMO_USERS.get((req.username or "").strip().lower()) or DEMO_USERS[role_key]

    otp = generate_otp()
    try:
        store_otp(clean_email, otp)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))

    success, dispatch_msg = send_otp_email(clean_email, otp, user_record["full_name"])

    if not success:
        return {
            "status": "ERROR",
            "message": dispatch_msg,
            "email": clean_email,
            "is_smtp_active": False,
        }

    return {
        "status": "SUCCESS",
        "message": dispatch_msg,
        "email": clean_email,
        "is_smtp_active": True,
    }


@router.post("/otp/verify", response_model=LoginResponse)
def verify_user_otp(req: VerifyOtpRequest, response: Response):
    """
    Verifies the submitted 6-digit OTP and completes authentication.
    Sets secure HttpOnly session cookie and returns session token.
    """
    is_valid, err_msg = verify_otp(req.email, req.otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    role_key = "admin" if req.role.upper() == "ADMIN" else "officer"
    user_record = DEMO_USERS.get((req.username or "").strip().lower()) or DEMO_USERS[role_key]

    profile = _safe_profile(user_record)
    token = create_session(profile)
    set_session_cookie(response, token)

    return LoginResponse(
        status="SUCCESS",
        message=f"OTP Verified. Authenticated as {profile['full_name']} ({profile['role']}).",
        token=token,
        user=UserProfile(**profile),
    )


@router.post("/logout")
def logout(request: Request, response: Response):
    """
    Invalidates session on server and removes the HttpOnly session cookie.
    """
    token = resolve_token(request)
    if token:
        invalidate_session(token)
    clear_session_cookie(response)
    return {"status": "SUCCESS", "message": "Logged out successfully."}


@router.get("/me")
def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Returns the profile of the currently authenticated user."""
    return {"status": "SUCCESS", "user": user}


@router.get("/demo-users")
def get_demo_users():
    """
    Returns available demonstration user roles for evaluators.
    Passwords and sensitive secrets are NEVER returned.
    """
    return [
        {
            "username": u["username"],
            "full_name": u["full_name"],
            "role": u["role"],
            "designation": u["designation"],
            "description": (
                "Full security command authority: approve routes, trigger scenario disruptions, add/lockdown zones."
                if u["role"] == "ADMIN"
                else "Field patrol guard: view assigned routes, inspect zones, report incidents."
                if u["role"] == "PATROL_OFFICER"
                else "Read-only campus safety observer: view map and risk scores."
            ),
        }
        for u in DEMO_USERS.values()
    ]

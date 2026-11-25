"""
Email OTP Service for LPU Campus Security AI.

Generates 6-digit cryptographically secure OTPs, dispatches emails via Gmail SMTP,
and handles verification with expiration, single-use deletion, attempt limits,
and resend cooldowns.

Security Features:
  - OTPs are hashed using bcrypt before storage (zero plaintext OTP storage in memory).
  - Enforces 60-second cooldown between resend requests per email address.
  - Expiration after 10 minutes.
  - Attempt limit: maximum 3 incorrect attempts before invalidation.
  - Single-use: OTP record is immediately deleted upon successful verification.
  - Genuine Gmail SMTP dispatch over SSL (port 465).
  - Never exposes OTPs in client API responses.
"""

import os
import secrets
import smtplib
import ssl
from pathlib import Path
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple

import bcrypt
from dotenv import load_dotenv

# Robustly load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# In-memory store:
# {
#   email: {
#       "otp_hash": str,
#       "expires_at": datetime,
#       "attempts": int,
#       "last_sent_at": datetime
#   }
# }
OTP_STORE: Dict[str, Dict[str, Any]] = {}

OTP_VALIDITY_MINUTES = 10
RESEND_COOLDOWN_SECONDS = 60
MAX_ATTEMPTS = 3


def generate_otp() -> str:
    """Generates a secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def _hash_otp(otp: str) -> str:
    return bcrypt.hashpw(otp.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_otp_hash(entered_otp: str, hashed_otp: str) -> bool:
    try:
        return bcrypt.checkpw(entered_otp.encode("utf-8"), hashed_otp.encode("utf-8"))
    except Exception:
        return False


def store_otp(email: str, otp: str) -> None:
    """
    Saves a bcrypt-hashed OTP with expiration timestamp and resets attempt counter.
    Enforces a 60-second cooldown on consecutive requests.
    """
    clean = email.lower().strip()
    now = datetime.now(timezone.utc)

    existing = OTP_STORE.get(clean)
    if existing and "last_sent_at" in existing:
        elapsed = (now - existing["last_sent_at"]).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
            raise ValueError(
                f"Please wait {remaining} seconds before requesting a new OTP."
            )

    OTP_STORE[clean] = {
        "otp_hash": _hash_otp(otp),
        "expires_at": now + timedelta(minutes=OTP_VALIDITY_MINUTES),
        "attempts": 0,
        "last_sent_at": now,
    }


def send_otp_email(
    recipient_email: str,
    otp: str,
    user_name: str = "Security Personnel",
    sender: str = None,
    app_pwd: str = None,
) -> Tuple[bool, str]:
    """
    Sends the OTP email to recipient's Gmail via smtp.gmail.com:465 over SSL.
    Requires GMAIL_SENDER and GMAIL_APP_PASSWORD in .env.
    """
    if sender is None:
        sender = os.getenv("GMAIL_SENDER", "")
    if app_pwd is None:
        app_pwd = os.getenv("GMAIL_APP_PASSWORD", "")

    sender = sender.strip("\"' ")
    app_pwd = app_pwd.strip("\"' ").replace(" ", "")

    has_valid_creds = bool(
        sender
        and app_pwd
        and sender != "your_email@gmail.com"
        and app_pwd != "your_16_character_app_password"
    )

    if not has_valid_creds:
        return (
            False,
            "Gmail SMTP credentials not configured. Please set GMAIL_SENDER and GMAIL_APP_PASSWORD in .env.",
        )

    subject = "[LPU Security AI] Your Verification Code"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #060A14; color: #E2E8F0; margin: 0; padding: 24px; }}
        .card {{ background: #0F172A; border: 1px solid #1E293B; border-radius: 16px; max-width: 500px; margin: 0 auto; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
        .header {{ text-align: center; border-bottom: 1px solid #1E293B; padding-bottom: 20px; margin-bottom: 24px; }}
        .header h2 {{ color: #38BDF8; margin: 0; font-size: 20px; }}
        .header p {{ color: #94A3B8; font-size: 12px; margin-top: 4px; }}
        .otp-box {{ background: #1E293B; border: 2px dashed #38BDF8; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }}
        .otp-code {{ font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FFFFFF; font-family: monospace; }}
        .footer {{ text-align: center; color: #64748B; font-size: 11px; margin-top: 24px; line-height: 1.5; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2>Lovely Professional University</h2>
          <p>Adaptive Campus Security Operations Terminal</p>
        </div>
        <p>Hello <strong>{user_name}</strong>,</p>
        <p>A login verification request was initiated for your security account. Please use the One-Time Password (OTP) below to authenticate:</p>
        <div class="otp-box">
          <div class="otp-code">{otp}</div>
        </div>
        <p style="font-size: 13px; color: #94A3B8;">
          This OTP is valid for <strong>{OTP_VALIDITY_MINUTES} minutes</strong>. Do not share this code with anyone.
        </p>
        <div class="footer">
          Lovely Professional University, Phagwara, Punjab 144411<br>
          AI Foundation Security Patrol Planning &amp; Coverage System
        </div>
      </div>
    </body>
    </html>
    """

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"LPU Campus Security AI <{sender}>"
        msg["To"] = recipient_email
        msg.set_content(
            f"Your LPU Campus Security AI OTP is: {otp}. "
            f"Valid for {OTP_VALIDITY_MINUTES} minutes."
        )
        msg.add_alternative(html_content, subtype="html")

        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.starttls(context=context)
            server.login(sender, app_pwd)
            server.send_message(msg)

        return True, f"OTP verification code sent to {recipient_email} via Gmail."
    except smtplib.SMTPAuthenticationError:
        return (
            False,
            "Gmail SMTP authentication failed. Please verify your GMAIL_APP_PASSWORD in .env.",
        )
    except Exception as e:
        return (
            False,
            f"Gmail SMTP dispatch failed: {str(e)}",
        )


def verify_otp(email: str, entered_otp: str) -> Tuple[bool, str]:
    """
    Verifies user-provided OTP against the hashed stored value.
    Enforces expiration, attempt limits, and single-use invalidation.
    """
    clean_email = email.lower().strip()
    record = OTP_STORE.get(clean_email)

    if not record:
        return False, "No active OTP request found for this email. Please request an OTP."

    # Check expiration
    if datetime.now(timezone.utc) > record["expires_at"]:
        del OTP_STORE[clean_email]
        return False, "OTP has expired. Please request a new one."

    # Check attempts
    if record["attempts"] >= MAX_ATTEMPTS:
        del OTP_STORE[clean_email]
        return False, "Maximum verification attempts exceeded. Please request a new OTP."

    # Compare hashes securely using bcrypt
    if not _verify_otp_hash(entered_otp.strip(), record["otp_hash"]):
        record["attempts"] += 1
        remaining = MAX_ATTEMPTS - record["attempts"]
        if remaining <= 0:
            del OTP_STORE[clean_email]
            return False, "Invalid OTP code. Maximum attempts exceeded. Please request a new OTP."
        return False, f"Invalid OTP code. {remaining} attempt(s) remaining."

    # OTP is valid -> delete record so it cannot be reused (Single-use guarantee)
    del OTP_STORE[clean_email]
    return True, "OTP verified successfully."

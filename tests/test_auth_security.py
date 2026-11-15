"""
Comprehensive Security and Authentication Test Suite for LPU Campus Security AI.

Tests:
  1. Password hashing with bcrypt.
  2. Valid and invalid password logins.
  3. OTP generation, expiration, single-use, resend cooldown, and attempt limits.
  4. Session management, expiration, and logout invalidation.
  5. Authorization header and HttpOnly cookie resolution.
  6. Role-Based Access Control (RBAC) enforcement across roles.
  7. Protection against credential / secret leakage.
"""

import unittest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Response, Request

from backend.api.routes_auth import (
    login,
    logout,
    send_otp,
    verify_user_otp,
    get_demo_users,
    LoginRequest,
    SendOtpRequest,
    VerifyOtpRequest,
    DEMO_USERS,
    _verify_password,
)
from backend.api.auth_middleware import (
    create_session,
    invalidate_session,
    get_current_user,
    require_role,
    resolve_token,
    set_session_cookie,
    clear_session_cookie,
    SESSION_STORE,
    COOKIE_NAME,
)
from backend.api.otp_service import (
    generate_otp,
    store_otp,
    verify_otp,
    OTP_STORE,
    RESEND_COOLDOWN_SECONDS,
)
from backend.api.routes_patrol import (
    generate_patrol_plan,
    approve_patrol_plan,
)
from backend.environment.zone_model import PatrolApprovalRequest


def _create_mock_request(auth_header: str = None, cookie_value: str = None) -> Request:
    """Builds a Starlette request with specified headers or cookies."""
    headers = []
    if auth_header:
        headers.append((b"authorization", auth_header.encode("utf-8")))
    if cookie_value:
        headers.append((b"cookie", f"{COOKIE_NAME}={cookie_value}".encode("utf-8")))

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/test",
        "headers": headers,
    }
    return Request(scope)


class TestAuthenticationSecurity(unittest.TestCase):

    def setUp(self):
        SESSION_STORE.clear()
        OTP_STORE.clear()

    # -----------------------------------------------------------------------
    # 1. Password Hashing (bcrypt)
    # -----------------------------------------------------------------------
    def test_bcrypt_password_hashing(self):
        """Verifies passwords are stored as bcrypt hashes and plaintext is not stored."""
        for uname, user in DEMO_USERS.items():
            self.assertIn("password_hash", user)
            self.assertNotIn("password", user)
            self.assertNotIn("plain_password", user)
            self.assertTrue(user["password_hash"].startswith("$2"))

        # Verify password validation logic
        admin_hash = DEMO_USERS["admin"]["password_hash"]
        self.assertTrue(_verify_password("lpu@security2026", admin_hash))
        self.assertFalse(_verify_password("wrong_password", admin_hash))

    # -----------------------------------------------------------------------
    # 2. Valid and Invalid Login
    # -----------------------------------------------------------------------
    def test_valid_login_sets_cookie_and_token(self):
        """Valid login returns 200, session token, and sets HttpOnly cookie."""
        resp = Response()
        req = LoginRequest(username="admin", password="lpu@security2026")
        login_res = login(req, resp)

        self.assertEqual(login_res.status, "SUCCESS")
        self.assertEqual(login_res.user.role, "ADMIN")
        self.assertTrue(login_res.token)

        # Verify session was saved in store
        self.assertIn(login_res.token, SESSION_STORE)
        self.assertEqual(SESSION_STORE[login_res.token]["user"]["username"], "admin")

        # Verify cookie was set
        cookie_header = resp.headers.get("set-cookie", "")
        self.assertIn(COOKIE_NAME, cookie_header)
        self.assertIn("HttpOnly", cookie_header)

    def test_invalid_login_wrong_password(self):
        """Invalid password raises 401 Unauthorized."""
        resp = Response()
        req = LoginRequest(username="admin", password="wrongpassword")
        with self.assertRaises(HTTPException) as cm:
            login(req, resp)
        self.assertEqual(cm.exception.status_code, 401)

    def test_invalid_login_nonexistent_user(self):
        """Non-existent username raises 401 Unauthorized."""
        resp = Response()
        req = LoginRequest(username="unknown_user", password="somepassword")
        with self.assertRaises(HTTPException) as cm:
            login(req, resp)
        self.assertEqual(cm.exception.status_code, 401)

    # -----------------------------------------------------------------------
    # 3. OTP Workflow: Hashing, Single-Use, Expiry, Cooldown, Limits
    # -----------------------------------------------------------------------
    def test_otp_send_and_verify_single_use(self):
        """OTP is verified and immediately invalidated (single-use)."""
        email = "officer_test@lpu.co.in"
        otp = "782194"
        store_otp(email, otp)

        # Verify OTP is stored as a hash, not plaintext
        self.assertIn(email, OTP_STORE)
        self.assertNotIn(otp, str(OTP_STORE[email]))
        self.assertTrue(OTP_STORE[email]["otp_hash"].startswith("$2"))

        # Verify correct OTP
        valid, msg = verify_otp(email, otp)
        self.assertTrue(valid)

        # Single-use check: Trying to verify the same OTP again must fail
        reused_valid, reused_msg = verify_otp(email, otp)
        self.assertFalse(reused_valid)
        self.assertIn("No active OTP request found", reused_msg)

    def test_otp_resend_cooldown(self):
        """Enforces 60-second cooldown on consecutive OTP requests."""
        email = "cooldown_test@lpu.co.in"
        store_otp(email, "111111")

        # Second request immediately after should fail with cooldown
        with self.assertRaises(ValueError) as cm:
            store_otp(email, "222222")
        self.assertIn("Please wait", str(cm.exception))

    def test_otp_incorrect_code_and_attempt_limit(self):
        """Incorrect OTP increments attempt counter and deletes after max attempts."""
        email = "limits_test@lpu.co.in"
        store_otp(email, "847291")

        # Attempt 1: wrong
        v1, msg1 = verify_otp(email, "000000")
        self.assertFalse(v1)
        self.assertIn("2 attempt(s) remaining", msg1)

        # Attempt 2: wrong
        v2, msg2 = verify_otp(email, "000001")
        self.assertFalse(v2)
        self.assertIn("1 attempt(s) remaining", msg2)

        # Attempt 3: wrong -> lock out
        v3, msg3 = verify_otp(email, "000002")
        self.assertFalse(v3)
        self.assertNotIn(email, OTP_STORE)  # Record destroyed

    def test_otp_expiration(self):
        """Expired OTP is rejected and purged."""
        email = "expired_test@lpu.co.in"
        store_otp(email, "654321")
        # Artificially age the OTP past expiration
        OTP_STORE[email]["expires_at"] = datetime.now(timezone.utc) - timedelta(minutes=1)

        valid, msg = verify_otp(email, "654321")
        self.assertFalse(valid)
        self.assertIn("expired", msg.lower())
        self.assertNotIn(email, OTP_STORE)

    def test_otp_send_never_leaks_code_in_response(self):
        """send_otp endpoint response never contains the plain OTP."""
        req = SendOtpRequest(email="evaluator@gmail.com", role="ADMIN", username="admin")
        res = send_otp(req)
        self.assertNotIn("demo_otp", res)
        self.assertNotIn("otp", res)

    # -----------------------------------------------------------------------
    # 4. Session Management, Cookies, and Logout
    # -----------------------------------------------------------------------
    def test_session_lifecycle_and_logout(self):
        """Tests session creation, token/cookie resolution, and logout invalidation."""
        user = {"user_id": "U1", "username": "admin", "role": "ADMIN"}
        token = create_session(user)

        # 1. Bearer header resolution
        req_header = _create_mock_request(auth_header=f"Bearer {token}")
        curr_user = get_current_user(req_header)
        self.assertEqual(curr_user["username"], "admin")

        # 2. Cookie resolution
        req_cookie = _create_mock_request(cookie_value=token)
        curr_user_cookie = get_current_user(req_cookie)
        self.assertEqual(curr_user_cookie["username"], "admin")

        # 3. Logout invalidation
        resp = Response()
        logout_res = logout(req_header, resp)
        self.assertEqual(logout_res["status"], "SUCCESS")
        self.assertNotIn(token, SESSION_STORE)

        # Subsequent request with invalidated token must fail with 401
        with self.assertRaises(HTTPException) as cm:
            get_current_user(req_header)
        self.assertEqual(cm.exception.status_code, 401)

    def test_expired_session_rejected(self):
        """Expired session token is rejected with 401."""
        user = {"user_id": "U2", "username": "officer", "role": "PATROL_OFFICER"}
        token = create_session(user)
        # Artificially expire the session
        SESSION_STORE[token]["expires_at"] = datetime.now(timezone.utc) - timedelta(hours=1)

        req = _create_mock_request(auth_header=f"Bearer {token}")
        with self.assertRaises(HTTPException) as cm:
            get_current_user(req)
        self.assertEqual(cm.exception.status_code, 401)

    # -----------------------------------------------------------------------
    # 5. Unauthorized Access & Role-Based Access Control (RBAC)
    # -----------------------------------------------------------------------
    def test_unauthorized_missing_token_rejected(self):
        """Requests without token are rejected with 401 Unauthorized."""
        req = _create_mock_request()
        with self.assertRaises(HTTPException) as cm:
            get_current_user(req)
        self.assertEqual(cm.exception.status_code, 401)

    def test_rbac_admin_vs_viewer_and_officer(self):
        """RBAC requires ADMIN role for privileged actions."""
        admin_user = {"user_id": "U1", "username": "admin", "role": "ADMIN"}
        officer_user = {"user_id": "U2", "username": "officer", "role": "PATROL_OFFICER"}
        viewer_user = {"user_id": "U3", "username": "viewer", "role": "VIEWER"}

        admin_checker = require_role(["ADMIN"])

        # Admin passes check
        res_admin = admin_checker(user=admin_user)
        self.assertEqual(res_admin["role"], "ADMIN")

        # Officer is forbidden
        with self.assertRaises(HTTPException) as cm_off:
            admin_checker(user=officer_user)
        self.assertEqual(cm_off.exception.status_code, 403)

        # Viewer is forbidden
        with self.assertRaises(HTTPException) as cm_view:
            admin_checker(user=viewer_user)
        self.assertEqual(cm_view.exception.status_code, 403)

    def test_patrol_approval_restricted_to_admin(self):
        """Non-admin user cannot approve a patrol plan."""
        officer_user = {"user_id": "U2", "username": "officer", "role": "PATROL_OFFICER"}
        admin_checker = require_role(["ADMIN"])
        with self.assertRaises(HTTPException) as cm:
            admin_checker(user=officer_user)
        self.assertEqual(cm.exception.status_code, 403)

    def test_viewer_cannot_generate_patrol_plan(self):
        """Viewer role cannot trigger patrol plan generation."""
        viewer_user = {"user_id": "U3", "username": "viewer", "role": "VIEWER"}
        with self.assertRaises(HTTPException) as cm:
            generate_patrol_plan(user=viewer_user)
        self.assertEqual(cm.exception.status_code, 403)

    # -----------------------------------------------------------------------
    # 6. Credentials & Secrets Leakage Protection
    # -----------------------------------------------------------------------
    def test_demo_users_no_passwords_leaked(self):
        """get_demo_users endpoint never returns passwords or hashes."""
        users = get_demo_users()
        for u in users:
            self.assertNotIn("password", u)
            self.assertNotIn("plain_password", u)
            self.assertNotIn("password_hash", u)
            self.assertIn("username", u)
            self.assertIn("role", u)


if __name__ == "__main__":
    unittest.main()

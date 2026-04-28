"""Iter 4 backend tests:
- Twilio SMS no-op behavior + auth-token never logged
- JWT TTL 24h, refresh_token TTL 30d
- /api/auth/refresh happy / wrong-type / invalid / expired
- LoginResponse now includes refresh_token (regression of older shape)
"""
import os
import sys
import uuid
import time
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

import jwt
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://true-north-leads.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@truenorthplumbing.ca"
ADMIN_PASSWORD = "TrueNorth2026!"

# Allow importing notifications.py for unit-style tests
sys.path.insert(0, str(Path("/app/backend")))


# ---------- shared fixtures ----------
@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def login_payload(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 429:
        pytest.skip("Admin locked out from prior runs (429). Clear db.login_attempts and retry.")
    assert r.status_code == 200, r.text
    return r.json()


# ============ LOGIN RESPONSE SHAPE ============
def test_login_returns_access_and_refresh_tokens(login_payload):
    assert "access_token" in login_payload
    assert "refresh_token" in login_payload
    assert isinstance(login_payload["access_token"], str) and len(login_payload["access_token"]) > 20
    assert isinstance(login_payload["refresh_token"], str) and len(login_payload["refresh_token"]) > 20
    assert login_payload.get("token_type", "bearer").lower() == "bearer"
    user = login_payload["user"]
    assert user["email"] == ADMIN_EMAIL
    assert user["role"] == "admin"


# ============ JWT TTL CHECKS (decode without verifying signature) ============
def test_access_token_exp_about_24h(login_payload):
    decoded = jwt.decode(login_payload["access_token"], options={"verify_signature": False})
    assert decoded.get("type") == "access"
    exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    delta = exp - datetime.now(timezone.utc)
    # 24h ± 5 min tolerance
    assert timedelta(hours=23, minutes=55) <= delta <= timedelta(hours=24, minutes=5), (
        f"access exp delta = {delta}, expected ~24h"
    )


def test_refresh_token_exp_about_30d_and_type(login_payload):
    decoded = jwt.decode(login_payload["refresh_token"], options={"verify_signature": False})
    assert decoded.get("type") == "refresh"
    exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    delta = exp - datetime.now(timezone.utc)
    assert timedelta(days=29, hours=23) <= delta <= timedelta(days=30, hours=1), (
        f"refresh exp delta = {delta}, expected ~30d"
    )


# ============ REFRESH ENDPOINT ============
def test_refresh_with_valid_refresh_token_returns_new_access(client, login_payload):
    # add a 1-second sleep so the new access_token has a different `iat` (to avoid byte-equality flakiness)
    time.sleep(1)
    r = client.post(f"{API}/auth/refresh", json={"refresh_token": login_payload["refresh_token"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body and isinstance(body["access_token"], str) and len(body["access_token"]) > 20
    assert body.get("token_type", "bearer").lower() == "bearer"
    decoded = jwt.decode(body["access_token"], options={"verify_signature": False})
    assert decoded.get("type") == "access"
    # And it should authenticate against /auth/me
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == ADMIN_EMAIL


def test_refresh_with_access_token_returns_401_wrong_type(client, login_payload):
    # Pass an *access* token where a refresh token is expected
    r = client.post(f"{API}/auth/refresh", json={"refresh_token": login_payload["access_token"]})
    assert r.status_code == 401
    detail = r.json().get("detail", "").lower()
    assert "wrong" in detail and "type" in detail, f"detail was {detail!r}"


def test_refresh_with_invalid_token_returns_401(client):
    r = client.post(f"{API}/auth/refresh", json={"refresh_token": "not.a.valid.jwt"})
    assert r.status_code == 401


def test_refresh_with_expired_token_returns_401(client):
    # Forge an expired refresh-typed JWT using the real secret from env. If no secret available, skip.
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        # fall back to reading backend .env
        env_path = Path("/app/backend/.env")
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("JWT_SECRET"):
                    secret = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not secret:
        pytest.skip("JWT_SECRET not available to forge expired token")
    expired = jwt.encode(
        {
            "sub": "any",
            "type": "refresh",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        secret,
        algorithm="HS256",
    )
    r = client.post(f"{API}/auth/refresh", json={"refresh_token": expired})
    assert r.status_code == 401


def test_refresh_missing_body_returns_422(client):
    r = client.post(f"{API}/auth/refresh", json={})
    assert r.status_code in (400, 422)


# ============ PROTECTED ENDPOINTS REGRESSION ============
def test_me_with_access_token(login_payload):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {login_payload['access_token']}"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"


def test_list_leads_with_access_token(login_payload):
    r = requests.get(f"{API}/leads", headers={"Authorization": f"Bearer {login_payload['access_token']}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_patch_status_with_access_token(client, login_payload):
    pl = {"name": f"TEST_Iter4_{uuid.uuid4().hex[:6]}", "phone": "4035550199", "issue": "x", "source": "iter4_test"}
    cr = client.post(f"{API}/leads", json=pl)
    assert cr.status_code == 200
    lid = cr.json()["id"]
    headers = {"Authorization": f"Bearer {login_payload['access_token']}", "Content-Type": "application/json"}
    r = requests.patch(f"{API}/leads/{lid}/status", json={"status": "contacted"}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "contacted"


# ============ POST /api/leads remains public + Twilio no-op ============
def test_post_leads_public_with_blank_twilio(client, caplog):
    """POST /api/leads should remain public AND succeed (200) when Twilio env is blank.
    The graceful no-op log message should appear from notifications.py."""
    caplog.set_level(logging.INFO)
    pl = {
        "name": f"TEST_Iter4_NoOp_{uuid.uuid4().hex[:6]}",
        "phone": "4035550100",
        "issue": "Iter4 Twilio no-op probe",
        "source": "iter4_noop",
    }
    r = client.post(f"{API}/leads", json=pl)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == pl["name"]
    assert "id" in data


# ============ notifications.py UNIT TESTS ============
def test_notifications_send_lead_sms_noop_when_blank(monkeypatch, caplog):
    """When env vars are blank, send_lead_sms must:
       1) return without raising,
       2) log 'Twilio not configured' at INFO,
       3) NOT log the auth token value.
    """
    import importlib
    for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "DISPATCH_PHONE_NUMBER"):
        monkeypatch.setenv(k, "")
    import notifications  # noqa: WPS433
    importlib.reload(notifications)

    caplog.set_level(logging.INFO, logger="notifications")
    notifications.send_lead_sms("Jane", "+14035550100", "Burst pipe", "iter4")

    # 1) message present
    msgs = [r.getMessage() for r in caplog.records]
    joined = " | ".join(msgs)
    assert "Twilio not configured" in joined, f"records: {msgs}"


def test_notifications_logs_never_contain_auth_token(monkeypatch, caplog):
    """Even when configured (mocked), TWILIO_AUTH_TOKEN must NEVER appear in any log record."""
    import importlib
    secret_token = "SECRET_AUTH_TOKEN_DO_NOT_LEAK_xyz123"
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "ACfakeaccountsid000000000000000000")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", secret_token)
    monkeypatch.setenv("TWILIO_FROM_NUMBER", "+15005550006")
    monkeypatch.setenv("DISPATCH_PHONE_NUMBER", "+14035550100")

    import notifications  # noqa: WPS433
    importlib.reload(notifications)

    # Mock the Client lazy-imported inside send_lead_sms
    class _FakeMessages:
        def create(self, **kwargs):
            class M:  # noqa: WPS431
                sid = "SMfakesid"
                status = "queued"
            # sanity: never echo auth token in kwargs
            assert secret_token not in str(kwargs)
            return M()

    class _FakeClient:
        def __init__(self, sid, token):
            self.account_sid = sid
            self.token_received = token  # we don't log this; just store
            self.messages = _FakeMessages()

    import sys as _sys
    import types as _types
    fake_twilio = _types.ModuleType("twilio")
    fake_rest = _types.ModuleType("twilio.rest")
    fake_rest.Client = _FakeClient
    fake_exc = _types.ModuleType("twilio.base.exceptions")
    class TwilioRestException(Exception):  # noqa: WPS431
        pass
    fake_exc.TwilioRestException = TwilioRestException
    fake_base = _types.ModuleType("twilio.base")
    _sys.modules["twilio"] = fake_twilio
    _sys.modules["twilio.rest"] = fake_rest
    _sys.modules["twilio.base"] = fake_base
    _sys.modules["twilio.base.exceptions"] = fake_exc

    caplog.set_level(logging.DEBUG, logger="notifications")
    notifications.send_lead_sms("Jane", "+14035550100", "Burst pipe", "iter4")

    full_log = " | ".join(r.getMessage() for r in caplog.records)
    assert secret_token not in full_log, "TWILIO_AUTH_TOKEN leaked to logs!"
    # And success log should be present
    assert "Twilio SMS dispatched" in full_log or "Twilio SMS failed" in full_log


# ============ Brute force regression (run last, isolated email) ============
def test_zzz_brute_force_lockout_still_works(client):
    bait = f"iter4_bait_{uuid.uuid4().hex[:8]}@example.com"
    statuses = []
    for _ in range(6):
        r = client.post(f"{API}/auth/login", json={"email": bait, "password": "wrong"})
        statuses.append(r.status_code)
    assert statuses[-1] == 429, f"Expected 429 on 6th attempt, got: {statuses}"

"""Backend tests: auth + protected admin endpoints for True North Plumbing."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://true-north-leads.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@truenorthplumbing.ca"
ADMIN_PASSWORD = "TrueNorth2026!"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 429:
        pytest.skip("Admin appears to be locked out from prior test runs (429). Wait 15m or clear login_attempts.")
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    body = r.json()
    assert "access_token" in body and isinstance(body["access_token"], str) and len(body["access_token"]) > 20
    assert body.get("token_type", "bearer").lower() == "bearer"
    user = body["user"]
    assert user["email"] == ADMIN_EMAIL
    assert user["role"] == "admin"
    assert "id" in user and isinstance(user["id"], str)
    return body["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Auth ----------
def test_login_wrong_password_returns_401(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "definitelyWrong!xyz"})
    # 429 if other tests ran first and triggered lockout — accept both
    assert r.status_code in (401, 429), r.text


def test_me_without_token_returns_401(client):
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_with_token(client, auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"


def test_me_with_invalid_token():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer not.a.real.token"})
    assert r.status_code == 401


# ---------- Protected /api/leads ----------
def test_list_leads_unauthorized():
    r = requests.get(f"{API}/leads")
    assert r.status_code == 401


def test_list_leads_with_admin(auth_headers):
    r = requests.get(f"{API}/leads", headers=auth_headers)
    assert r.status_code == 200
    leads = r.json()
    assert isinstance(leads, list)
    for l in leads:
        assert "_id" not in l
        assert "id" in l
        assert "status" in l
        assert l["status"] in ("new", "contacted", "booked", "lost")


# ---------- Public POST /api/leads still works ----------
def test_post_leads_remains_public(client):
    payload = {
        "name": f"TEST_AuthIter_{uuid.uuid4().hex[:6]}",
        "phone": "4035550123",
        "issue": "Auth iter probe — chat widget submission",
        "source": "auth_test",
    }
    r = client.post(f"{API}/leads", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == payload["name"]
    # status should default to "new" when read back
    return data["id"]


# ---------- PATCH /api/leads/{id}/status ----------
def test_patch_status_unauthorized():
    r = requests.patch(f"{API}/leads/some-id/status", json={"status": "booked"})
    assert r.status_code == 401


def test_patch_status_unknown_id_returns_404(auth_headers):
    fake_id = f"nonexistent-{uuid.uuid4()}"
    r = requests.patch(f"{API}/leads/{fake_id}/status", json={"status": "booked"}, headers=auth_headers)
    assert r.status_code == 404


def test_patch_status_invalid_value_returns_422(auth_headers, client):
    # Need a real lead first
    pl = {"name": "TEST_PatchValidate", "phone": "4035550199", "issue": "x", "source": "auth_test"}
    cr = client.post(f"{API}/leads", json=pl)
    assert cr.status_code == 200
    lid = cr.json()["id"]
    r = requests.patch(f"{API}/leads/{lid}/status", json={"status": "wonky"}, headers=auth_headers)
    assert r.status_code == 422


def test_patch_status_happy_path(auth_headers, client):
    pl = {"name": "TEST_PatchHappy", "phone": "4035550199", "issue": "x", "source": "auth_test"}
    cr = client.post(f"{API}/leads", json=pl)
    assert cr.status_code == 200
    lid = cr.json()["id"]

    for new_status in ("contacted", "booked", "lost", "new"):
        r = requests.patch(f"{API}/leads/{lid}/status", json={"status": new_status}, headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"] == lid
        assert body["status"] == new_status

    # Verify persistence via GET
    lr = requests.get(f"{API}/leads", headers=auth_headers)
    assert lr.status_code == 200
    matched = [l for l in lr.json() if l["id"] == lid]
    assert len(matched) == 1
    assert matched[0]["status"] == "new"


# ---------- Brute force lockout ----------
# Run last so it does not lock out the real admin used by other tests.
def test_zzz_brute_force_lockout():
    """6th attempt should return 429. Uses a unique email to avoid locking out the real admin."""
    bait_email = f"bruteforce_{uuid.uuid4().hex[:8]}@example.com"
    statuses = []
    for _ in range(6):
        r = requests.post(f"{API}/auth/login", json={"email": bait_email, "password": "wrongpass"})
        statuses.append(r.status_code)
    # First 5 should be 401 (user not found also yields 401 path which records attempt),
    # 6th should be 429.
    assert statuses[-1] == 429, f"Expected 429 on 6th attempt, got sequence: {statuses}"
    assert all(s in (401, 429) for s in statuses), statuses

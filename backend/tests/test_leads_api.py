"""Backend tests for True North Plumbing Leads API."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://true-north-leads.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@truenorthplumbing.ca"
ADMIN_PASSWORD = "TrueNorth2026!"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login unavailable ({r.status_code}); skipping protected tests")
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {r.json()['access_token']}",
    })
    return s


# Health
def test_root_health(client):
    r = client.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("message") == "Hello World"


# POST /api/leads — happy path
def test_create_lead_success(client):
    payload = {
        "name": "TEST_John Smith",
        "phone": "(403) 555-0199",
        "issue": "Burst pipe under kitchen sink",
        "source": "hero_cta",
    }
    r = client.post(f"{API}/leads", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data and isinstance(data["id"], str) and len(data["id"]) > 0
    assert data["name"] == payload["name"]
    assert data["phone"] == payload["phone"]
    assert data["issue"] == payload["issue"]
    assert data["source"] == "hero_cta"
    assert "created_at" in data
    assert "_id" not in data


# Verify persistence via GET (now protected — requires admin session)
def test_create_then_list_includes(client, admin_session):
    unique_name = "TEST_Persist_User_X9Z"
    payload = {
        "name": unique_name,
        "phone": "4035550100",
        "issue": "Leaking water heater",
        "source": "service_water_heater",
    }
    cr = client.post(f"{API}/leads", json=payload)
    assert cr.status_code == 200
    created_id = cr.json()["id"]

    lr = admin_session.get(f"{API}/leads")
    assert lr.status_code == 200
    leads = lr.json()
    assert isinstance(leads, list)
    # No _id leakage
    for lead in leads:
        assert "_id" not in lead
    # Find our record
    matched = [l for l in leads if l.get("id") == created_id]
    assert len(matched) == 1
    assert matched[0]["name"] == unique_name
    assert matched[0]["source"] == "service_water_heater"


# Validation: empty name
def test_create_lead_empty_name(client):
    r = client.post(f"{API}/leads", json={"name": "", "phone": "4035550199", "issue": "Clog"})
    assert r.status_code in (400, 422)


# Validation: missing phone
def test_create_lead_missing_phone(client):
    r = client.post(f"{API}/leads", json={"name": "TEST_NoPhone", "issue": "Clog"})
    assert r.status_code in (400, 422)


# Validation: empty issue
def test_create_lead_empty_issue(client):
    r = client.post(f"{API}/leads", json={"name": "TEST_NoIssue", "phone": "4035550199", "issue": ""})
    assert r.status_code in (400, 422)


# Validation: phone too short
def test_create_lead_short_phone(client):
    r = client.post(f"{API}/leads", json={"name": "TEST_X", "phone": "12", "issue": "Clog"})
    assert r.status_code in (400, 422)


# Default source applied when missing
def test_create_lead_default_source(client):
    r = client.post(f"{API}/leads", json={
        "name": "TEST_DefaultSource",
        "phone": "4035550111",
        "issue": "Drain backed up",
    })
    assert r.status_code == 200
    assert r.json().get("source") == "hero_cta"

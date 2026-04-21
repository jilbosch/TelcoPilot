"""TelcoPilot backend tests - auth, anonymization, sessions, ownership."""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://operador-asistente.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _register_user(s, email, password="telco123", name="Test Op"):
    r = s.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name})
    return r


@pytest.fixture(scope="session")
def user_a(session_client):
    email = f"TEST_a_{uuid.uuid4().hex[:8]}@telco.es"
    r = _register_user(session_client, email)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["token"], "id": data["user"]["id"]}


@pytest.fixture(scope="session")
def user_b(session_client):
    email = f"TEST_b_{uuid.uuid4().hex[:8]}@telco.es"
    r = _register_user(session_client, email)
    assert r.status_code == 200
    data = r.json()
    return {"email": email, "token": data["token"], "id": data["user"]["id"]}


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_register_creates_user(self, session_client, user_a):
        assert len(user_a["token"]) > 20
        assert user_a["id"]

    def test_login_success(self, session_client):
        email = f"TEST_login_{uuid.uuid4().hex[:8]}@telco.es"
        _register_user(session_client, email, "pass123", "L Login")
        r = session_client.post(f"{API}/auth/login", json={"email": email, "password": "pass123"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == email.lower()

    def test_login_wrong_password(self, session_client, user_a):
        r = session_client.post(f"{API}/auth/login", json={"email": user_a["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_valid_token(self, session_client, user_a):
        r = session_client.get(f"{API}/auth/me", headers=_h(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == user_a["email"].lower()

    def test_me_no_token(self, session_client):
        r = session_client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_duplicate_register(self, session_client, user_a):
        r = _register_user(session_client, user_a["email"])
        assert r.status_code == 400


# ---------- Catalog ----------
class TestCatalog:
    def test_catalog_returns_8(self, session_client, user_a):
        r = session_client.get(f"{API}/incidents/catalog", headers=_h(user_a["token"]))
        assert r.status_code == 200
        incidents = r.json()["incidents"]
        assert len(incidents) == 8
        ids = {i["id"] for i in incidents}
        expected = {"sin_datos", "apn", "roaming", "fibra_caida", "router",
                    "portabilidad", "microcortes", "velocidad_lenta"}
        assert ids == expected

    def test_catalog_requires_auth(self, session_client):
        r = session_client.get(f"{API}/incidents/catalog")
        assert r.status_code == 401


# ---------- Anonymization ----------
class TestAnonymize:
    def test_preview_all_pii(self, session_client, user_a):
        text = "Me llamo Juan García, DNI 12345678A, tel 666123456, email a@b.com"
        r = session_client.post(f"{API}/anonymize/preview", json={"text": text}, headers=_h(user_a["token"]))
        assert r.status_code == 200
        data = r.json()
        red = data["redacted"]
        types = {x["type"] for x in data["redactions"]}
        assert "NAME" in types, f"NAME missing: {types}"
        assert "DNI" in types
        assert "PHONE" in types
        assert "EMAIL" in types
        # Verify raw PII is NOT in redacted output
        assert "Juan" not in red
        assert "12345678A" not in red
        assert "666123456" not in red
        assert "a@b.com" not in red

    def test_preview_iban_ip_nie(self, session_client, user_a):
        text = "IBAN ES9121000418450200051332, IP 192.168.1.1, NIE X1234567L"
        r = session_client.post(f"{API}/anonymize/preview", json={"text": text}, headers=_h(user_a["token"]))
        assert r.status_code == 200
        types = {x["type"] for x in r.json()["redactions"]}
        assert "IBAN" in types
        assert "IP" in types
        assert "NIE" in types

    def test_preview_empty(self, session_client, user_a):
        r = session_client.post(f"{API}/anonymize/preview", json={"text": "hola mundo"}, headers=_h(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["redactions"] == []


# ---------- Sessions ----------
class TestSessions:
    def test_start_session_valid(self, session_client, user_a):
        r = session_client.post(f"{API}/sessions/start", json={"incident_type": "sin_datos"}, headers=_h(user_a["token"]))
        assert r.status_code == 200
        data = r.json()
        assert data["incident_type"] == "sin_datos"
        assert len(data["checklist"]) >= 5
        assert all(c["status"] == "pending" for c in data["checklist"])
        pytest.session_id_a = data["id"]
        pytest.first_step_id = data["checklist"][0]["id"]

    def test_start_session_invalid(self, session_client, user_a):
        r = session_client.post(f"{API}/sessions/start", json={"incident_type": "NOPE"}, headers=_h(user_a["token"]))
        assert r.status_code == 400

    def test_checklist_update(self, session_client, user_a):
        sid = pytest.session_id_a
        step = pytest.first_step_id
        r = session_client.patch(f"{API}/sessions/{sid}/checklist",
                                 json={"step_id": step, "status": "ok"},
                                 headers=_h(user_a["token"]))
        assert r.status_code == 200
        checklist = r.json()["checklist"]
        assert next(c for c in checklist if c["id"] == step)["status"] == "ok"

        # verify persistence via GET
        g = session_client.get(f"{API}/sessions/{sid}", headers=_h(user_a["token"]))
        assert g.status_code == 200
        assert next(c for c in g.json()["checklist"] if c["id"] == step)["status"] == "ok"

    def test_checklist_invalid_status(self, session_client, user_a):
        sid = pytest.session_id_a
        step = pytest.first_step_id
        r = session_client.patch(f"{API}/sessions/{sid}/checklist",
                                 json={"step_id": step, "status": "invalid"},
                                 headers=_h(user_a["token"]))
        assert r.status_code == 400

    def test_list_sessions(self, session_client, user_a):
        r = session_client.get(f"{API}/sessions", headers=_h(user_a["token"]))
        assert r.status_code == 200
        assert any(s["id"] == pytest.session_id_a for s in r.json())

    def test_stats_me(self, session_client, user_a):
        r = session_client.get(f"{API}/stats/me", headers=_h(user_a["token"]))
        assert r.status_code == 200
        data = r.json()
        assert "total" in data and "today" in data and "escalated" in data
        assert data["total"] >= 1


# ---------- Ownership ----------
class TestOwnership:
    def test_user_b_cannot_access_user_a_session(self, session_client, user_a, user_b):
        sid = pytest.session_id_a
        r = session_client.get(f"{API}/sessions/{sid}", headers=_h(user_b["token"]))
        assert r.status_code == 404

    def test_user_b_cannot_patch_user_a_session(self, session_client, user_b):
        sid = pytest.session_id_a
        r = session_client.patch(f"{API}/sessions/{sid}/checklist",
                                 json={"step_id": pytest.first_step_id, "status": "ok"},
                                 headers=_h(user_b["token"]))
        assert r.status_code == 404

    def test_sessions_list_isolated(self, session_client, user_b):
        r = session_client.get(f"{API}/sessions", headers=_h(user_b["token"]))
        assert r.status_code == 200
        assert all(s["id"] != pytest.session_id_a for s in r.json())


# ---------- LLM flows (slow) ----------
class TestLLM:
    def test_analyze_with_pii(self, session_client, user_a):
        sid = pytest.session_id_a
        raw = "Me llamo Juan García, DNI 12345678A, mi teléfono 666123456. No tengo datos móviles."
        r = session_client.post(f"{API}/sessions/{sid}/analyze",
                                json={"free_text": raw},
                                headers=_h(user_a["token"]), timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "ai_suggestion" in data and len(data["ai_suggestion"]) > 20
        # Ensure PII was stripped in what was sent to LLM
        assert "Juan" not in data["redacted"]
        assert "12345678A" not in data["redacted"]
        assert "666123456" not in data["redacted"]

    def test_generate_summary(self, session_client, user_a):
        sid = pytest.session_id_a
        r = session_client.post(f"{API}/sessions/{sid}/summary",
                                headers=_h(user_a["token"]), timeout=90)
        assert r.status_code == 200, r.text
        assert len(r.json()["summary"]) > 30

    def test_stats_escalated_increments(self, session_client, user_a):
        r = session_client.get(f"{API}/stats/me", headers=_h(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["escalated"] >= 1


# ---------- P2: Role-based auth + supervisor dashboard ----------
SUPERVISOR_EMAIL = "supervisor@telco.es"
SUPERVISOR_PASSWORD = "super123"
OPERATOR_EMAIL = "operador@telco.es"
OPERATOR_PASSWORD = "telco123"


def _ensure_operator(s):
    # Try login first; if fails, register
    r = s.post(f"{API}/auth/login", json={"email": OPERATOR_EMAIL, "password": OPERATOR_PASSWORD})
    if r.status_code == 200:
        return r.json()
    r = s.post(f"{API}/auth/register", json={"email": OPERATOR_EMAIL, "password": OPERATOR_PASSWORD, "name": "María García"})
    assert r.status_code == 200, r.text
    return r.json()


class TestRoles:
    def test_supervisor_login_returns_role(self, session_client):
        r = session_client.post(f"{API}/auth/login", json={"email": SUPERVISOR_EMAIL, "password": SUPERVISOR_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "supervisor"
        assert data["user"]["email"] == SUPERVISOR_EMAIL
        pytest.sup_token = data["token"]

    def test_supervisor_me_role(self, session_client):
        r = session_client.get(f"{API}/auth/me", headers=_h(pytest.sup_token))
        assert r.status_code == 200
        assert r.json()["role"] == "supervisor"

    def test_operator_login_returns_role(self, session_client):
        data = _ensure_operator(session_client)
        assert data["user"]["role"] == "operator"
        pytest.op_token = data["token"]

    def test_operator_me_role(self, session_client):
        r = session_client.get(f"{API}/auth/me", headers=_h(pytest.op_token))
        assert r.status_code == 200
        assert r.json()["role"] == "operator"

    def test_new_register_default_operator(self, session_client, user_b):
        r = session_client.get(f"{API}/auth/me", headers=_h(user_b["token"]))
        assert r.status_code == 200
        assert r.json()["role"] == "operator"


class TestAdminOverview:
    def test_supervisor_can_access_overview(self, session_client):
        r = session_client.get(f"{API}/admin/overview", headers=_h(pytest.sup_token))
        assert r.status_code == 200, r.text
        data = r.json()
        # Structure checks
        assert "kpis" in data
        assert "incidents_breakdown" in data
        assert "per_operator" in data
        assert "daily" in data
        # KPI fields
        kpis = data["kpis"]
        for k in ["total_sessions", "today", "week", "escalated", "escalation_rate", "avg_resolution_seconds", "operators"]:
            assert k in kpis, f"Missing kpi: {k}"
        # Daily must be 7 entries
        assert isinstance(data["daily"], list)
        assert len(data["daily"]) == 7
        for d in data["daily"]:
            assert "date" in d and "sessions" in d
        # Types
        assert isinstance(data["incidents_breakdown"], list)
        assert isinstance(data["per_operator"], list)

    def test_operator_forbidden_from_overview(self, session_client):
        r = session_client.get(f"{API}/admin/overview", headers=_h(pytest.op_token))
        assert r.status_code == 403

    def test_overview_no_auth(self, session_client):
        r = session_client.get(f"{API}/admin/overview")
        assert r.status_code == 401

    def test_operator_stats_still_works(self, session_client):
        r = session_client.get(f"{API}/stats/me", headers=_h(pytest.op_token))
        assert r.status_code == 200
        assert "total" in r.json()


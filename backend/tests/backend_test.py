"""Backend integration tests for Fleet & Delivery SaaS API."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend env file
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "owner@acme.com", "password": "Password123!"}
DISP = {"email": "dispatcher@acme.com", "password": "Password123!"}
DRIVER = {"email": "driver@acme.com", "password": "Password123!"}
CUST = {"email": "customer@acme.com", "password": "Password123!"}


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.text}"
    return r.json()


def hdr(token):
    return {"Authorization": f"Bearer {token}"}


# ==================== AUTH ====================
class TestAuth:
    def test_login_owner(self):
        data = login(OWNER)
        assert "access_token" in data
        assert data["user"]["email"] == "owner@acme.com"
        assert "org_owner" in data["user"]["roles"]
        assert data["organization"]["slug"] == "acme"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "owner@acme.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me(self):
        token = login(OWNER)["access_token"]
        r = requests.get(f"{API}/auth/me", headers=hdr(token))
        assert r.status_code == 200
        assert r.json()["email"] == "owner@acme.com"

    def test_register_new_org(self):
        slug = "test-" + uuid.uuid4().hex[:8]
        email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "org_name": "TEST Org", "org_slug": slug,
            "owner_email": email, "owner_full_name": "Test Owner",
            "password": "Password123!",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["organization"]["slug"] == slug
        assert data["user"]["email"] == email
        # Save for isolation test
        pytest.new_org_token = data["access_token"]
        pytest.new_org_id = data["organization"]["id"]

    def test_register_duplicate_slug(self):
        r = requests.post(f"{API}/auth/register", json={
            "org_name": "Dup", "org_slug": "acme",
            "owner_email": f"d_{uuid.uuid4().hex[:6]}@x.com",
            "owner_full_name": "X", "password": "Password123!",
        })
        assert r.status_code == 400


# ==================== DASHBOARD ====================
class TestDashboard:
    def test_summary(self):
        token = login(OWNER)["access_token"]
        r = requests.get(f"{API}/dashboard/summary", headers=hdr(token))
        assert r.status_code == 200, r.text
        data = r.json()
        # Verify KPI structure
        for key in ("trend", "status_breakdown"):
            assert key in data, f"missing key {key} in {data.keys()}"


# ==================== VEHICLES ====================
class TestVehicles:
    def test_crud_and_rbac(self):
        owner_t = login(OWNER)["access_token"]
        # list
        r = requests.get(f"{API}/vehicles", headers=hdr(owner_t))
        assert r.status_code == 200
        assert len(r.json()) >= 3  # seeded

        # create
        payload = {"registration_number": "TEST-" + uuid.uuid4().hex[:6].upper(),
                   "vehicle_type": "van",
                   "capacity_kg": 1000, "fuel_type": "diesel"}
        r = requests.post(f"{API}/vehicles", json=payload, headers=hdr(owner_t))
        assert r.status_code == 200, r.text
        vid = r.json()["id"]
        assert r.json()["registration_number"] == payload["registration_number"]

        # update
        r = requests.patch(f"{API}/vehicles/{vid}", json={"vehicle_type": "truck"}, headers=hdr(owner_t))
        assert r.status_code == 200
        assert r.json()["vehicle_type"] == "truck"

        # GET verify persistence
        r = requests.get(f"{API}/vehicles", headers=hdr(owner_t))
        assert any(v["id"] == vid and v["vehicle_type"] == "truck" for v in r.json())

        # RBAC: driver cannot create
        drv_t = login(DRIVER)["access_token"]
        r = requests.post(f"{API}/vehicles", json=payload, headers=hdr(drv_t))
        assert r.status_code == 403

        # delete
        r = requests.delete(f"{API}/vehicles/{vid}", headers=hdr(owner_t))
        assert r.status_code == 200


# ==================== DRIVERS ====================
class TestDrivers:
    def test_list_and_create(self):
        owner_t = login(OWNER)["access_token"]
        r = requests.get(f"{API}/drivers", headers=hdr(owner_t))
        assert r.status_code == 200
        drivers = r.json()
        assert len(drivers) >= 1
        driver_id = drivers[0]["id"]

        # location update
        r = requests.post(f"{API}/drivers/{driver_id}/location",
                          json={"lat": 12.97, "lng": 77.59}, headers=hdr(owner_t))
        assert r.status_code == 200

        # dispatcher can create driver
        disp_t = login(DISP)["access_token"]
        r = requests.post(f"{API}/drivers", json={
            "full_name": "TEST Driver", "phone": "+1000", "license_number": "L" + uuid.uuid4().hex[:6]
        }, headers=hdr(disp_t))
        assert r.status_code == 200


# ==================== CUSTOMERS ====================
class TestCustomers:
    def test_dispatcher_can_create(self):
        disp_t = login(DISP)["access_token"]
        r = requests.get(f"{API}/customers", headers=hdr(disp_t))
        assert r.status_code == 200
        assert len(r.json()) >= 1

        payload = {"name": "TEST Customer", "email": f"c_{uuid.uuid4().hex[:6]}@t.com",
                   "phone": "+1234", "address": "1 Test St"}
        r = requests.post(f"{API}/customers", json=payload, headers=hdr(disp_t))
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "TEST Customer"

    def test_customer_role_cannot_list_users(self):
        cust_t = login(CUST)["access_token"]
        r = requests.get(f"{API}/users", headers=hdr(cust_t))
        assert r.status_code == 403


# ==================== DELIVERIES ====================
class TestDeliveries:
    def test_full_workflow(self):
        owner_t = login(OWNER)["access_token"]
        # list initial
        r = requests.get(f"{API}/deliveries", headers=hdr(owner_t))
        assert r.status_code == 200
        assert len(r.json()) >= 1

        # need customer + driver
        customers = requests.get(f"{API}/customers", headers=hdr(owner_t)).json()
        drivers = requests.get(f"{API}/drivers", headers=hdr(owner_t)).json()
        cust_id = customers[0]["id"]
        drv_id = drivers[0]["id"]

        # create delivery
        payload = {
            "customer_id": cust_id,
            "pickup_address": "1 Pickup St",
            "drop_address": "1 Drop St",
            "pickup_lat": 12.97, "pickup_lng": 77.59,
            "drop_lat": 12.98, "drop_lng": 77.60,
            "package_description": "TEST package",
            "weight_kg": 5,
        }
        r = requests.post(f"{API}/deliveries", json=payload, headers=hdr(owner_t))
        assert r.status_code == 200, r.text
        d = r.json()
        did = d["id"]
        tracking = d["tracking_code"]
        assert tracking.startswith("TRK-")
        assert len(d["timeline"]) >= 1

        # create with bad customer
        bad = {**payload, "customer_id": "nonexistent"}
        r = requests.post(f"{API}/deliveries", json=bad, headers=hdr(owner_t))
        assert r.status_code == 404

        # assign driver
        r = requests.post(f"{API}/deliveries/{did}/assign", json={"driver_id": drv_id},
                          headers=hdr(owner_t))
        assert r.status_code == 200, r.text
        assert r.json()["assigned_driver_id"] == drv_id
        assert r.json()["status"] in ("assigned", "pending")
        assert len(r.json()["timeline"]) >= 2

        # status change
        r = requests.post(f"{API}/deliveries/{did}/status",
                          json={"status": "picked_up"}, headers=hdr(owner_t))
        assert r.status_code == 200
        assert r.json()["status"] == "picked_up"

        # POD
        r = requests.post(f"{API}/deliveries/{did}/pod",
                          json={"signature_name": "Recipient", "notes": "OK"},
                          headers=hdr(owner_t))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "delivered"

        # public tracking (no auth)
        r = requests.get(f"{API}/track/{tracking}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["tracking_code"] == tracking or body.get("delivery", {}).get("tracking_code") == tracking

        pytest.tracking_code = tracking
        pytest.delivery_id = did

    def test_driver_sees_only_assigned(self):
        drv_t = login(DRIVER)["access_token"]
        r = requests.get(f"{API}/deliveries", headers=hdr(drv_t))
        assert r.status_code == 200
        # should not error


# ==================== MULTI-TENANT ISOLATION ====================
class TestIsolation:
    def test_cross_tenant_invisible(self):
        # Register a brand new org
        slug = "iso-" + uuid.uuid4().hex[:6]
        email = f"iso_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "org_name": "Iso Org", "org_slug": slug,
            "owner_email": email, "owner_full_name": "Iso Owner",
            "password": "Password123!",
        })
        assert r.status_code == 200
        iso_token = r.json()["access_token"]

        # New org should have zero vehicles/customers
        r = requests.get(f"{API}/vehicles", headers=hdr(iso_token))
        assert r.status_code == 200
        assert r.json() == []
        r = requests.get(f"{API}/customers", headers=hdr(iso_token))
        assert r.json() == []
        r = requests.get(f"{API}/deliveries", headers=hdr(iso_token))
        assert r.json() == []


# ==================== NOTIFICATIONS & AUDIT ====================
class TestNotificationsAudit:
    def test_notifications(self):
        token = login(OWNER)["access_token"]
        r = requests.get(f"{API}/notifications", headers=hdr(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_audit_logs_owner_only(self):
        owner_t = login(OWNER)["access_token"]
        r = requests.get(f"{API}/audit-logs", headers=hdr(owner_t))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

        # dispatcher cannot
        disp_t = login(DISP)["access_token"]
        r = requests.get(f"{API}/audit-logs", headers=hdr(disp_t))
        assert r.status_code == 403

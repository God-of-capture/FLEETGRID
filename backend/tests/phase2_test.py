"""Phase 2 integration tests — onboarding, offers, verification, POD, ratings."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "owner@acme.com", "password": "Password123!"}
DRIVER = {"email": "driver@acme.com", "password": "Password123!"}


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


def hdr(token):
    return {"Authorization": f"Bearer {token}"}


class TestPhase2Onboarding:
    def test_onboarding_flow(self):
        email = f"partner-{uuid.uuid4().hex[:8]}@test.com"
        reg = requests.post(f"{API}/auth/register", json={
            "org_name": "Partner Co", "org_slug": f"p-{uuid.uuid4().hex[:6]}",
            "owner_email": email, "owner_full_name": "Test Partner", "password": "Password123!",
        }, timeout=15)
        assert reg.status_code == 200
        token = reg.json()["access_token"]

        r = requests.get(f"{API}/partner/onboarding/me", headers=hdr(token), timeout=15)
        assert r.status_code == 200
        assert r.json()["current_step"] >= 1

        r = requests.patch(f"{API}/partner/onboarding/step", headers=hdr(token), json={
            "step": 1, "data": {"full_name": "Test Partner", "email": email, "phone": "+91-9999999999", "date_of_birth": "1990-01-01"},
        }, timeout=15)
        assert r.status_code == 200

        r = requests.patch(f"{API}/partner/onboarding/step", headers=hdr(token), json={
            "step": 2, "data": {"address_line": "123 Main St", "city": "Mumbai", "state": "MH", "postal_code": "400001"},
        }, timeout=15)
        assert r.status_code == 200


class TestPhase2Offers:
    def test_offer_and_accept(self):
        owner = login(OWNER)
        driver = login(DRIVER)
        ot, dt = owner["access_token"], driver["access_token"]

        cust = requests.post(f"{API}/customers", headers=hdr(ot), json={
            "name": "Offer Test", "phone": f"+1-555-{uuid.uuid4().hex[:4]}",
        }, timeout=15).json()

        delivery = requests.post(f"{API}/deliveries", headers=hdr(ot), json={
            "customer_id": cust["id"],
            "pickup_address": "Andheri East, Mumbai",
            "pickup_lat": 19.1136, "pickup_lng": 72.8697,
            "drop_address": "Bandra West, Mumbai",
            "drop_lat": 19.0596, "drop_lng": 72.8295,
            "package_description": "Test parcel", "weight_kg": 2,
        }, timeout=15).json()

        r = requests.post(f"{API}/deliveries/{delivery['id']}/offer", headers=hdr(ot), json={
            "radius_km": 50, "offer_ttl_minutes": 30, "max_drivers": 5,
        }, timeout=15)
        assert r.status_code == 200, r.text
        offers = r.json()
        assert len(offers) >= 1

        jobs = requests.get(f"{API}/driver/jobs", headers=hdr(dt), timeout=15).json()
        assert len(jobs.get("offers", [])) >= 1

        offer_id = jobs["offers"][0]["id"]
        r = requests.post(f"{API}/offers/{offer_id}/accept", headers=hdr(dt), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "assigned"
        assert r.json()["assigned_driver_id"] is not None

        r2 = requests.post(f"{API}/offers/{offer_id}/accept", headers=hdr(dt), timeout=15)
        assert r2.status_code == 409


class TestPhase2Operations:
    def test_operations_dashboard(self):
        owner = login(OWNER)
        r = requests.get(f"{API}/dashboard/operations", headers=hdr(owner["access_token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "pending_verifications" in data
        assert "active_offers" in data
        assert "available_drivers" in data


class TestPhase2VerificationRBAC:
    def test_verification_queue_owner_only(self):
        driver = login(DRIVER)
        r = requests.get(f"{API}/admin/verification/queue", headers=hdr(driver["access_token"]), timeout=15)
        assert r.status_code == 403

        owner = login(OWNER)
        r = requests.get(f"{API}/admin/verification/queue", headers=hdr(owner["access_token"]), timeout=15)
        assert r.status_code == 200

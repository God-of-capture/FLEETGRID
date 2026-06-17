"""Main FastAPI app. All routes prefixed with /api."""
import logging
import os
import random
import secrets
import string
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

import razorpay  # noqa: E402

from models import (  # noqa: E402
    AuditLog, Customer, CustomerCreate, CustomerUpdate, Delivery, DeliveryAssign,
    DeliveryCreate, DeliveryStatus, DeliveryStatusChange, Driver, DriverCreate,
    DriverUpdate, ForgotPasswordRequest, InviteUserRequest, LocationUpdate,
    LoginRequest, Notification, Organization, OrganizationUpdate, PlanChoice,
    PODSubmit, RazorpayVerify, RegisterOrgRequest, ResendVerificationRequest,
    ResetPasswordRequest, Role, StatusEvent, TokenResponse, User, UserPublic,
    VehicleCreate, VehicleUpdate, Vehicle, VerifyEmailRequest,
)
from auth import (  # noqa: E402
    create_access_token, get_current_user, hash_password, require_roles,
    tenant_scope, verify_password,
)
import emailer  # noqa: E402

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Razorpay client
RZP_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
rzp = razorpay.Client(auth=(RZP_KEY_ID, RZP_KEY_SECRET)) if RZP_KEY_ID else None

PLANS = {
    "starter": {"name": "Starter", "price_inr": 4999, "max_drivers": 5},
    "growth": {"name": "Growth", "price_inr": 12999, "max_drivers": 25},
    "enterprise": {"name": "Enterprise", "price_inr": 49999, "max_drivers": 9999},
}

app = FastAPI(title="Fleet & Delivery SaaS API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("server")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_tracking_code() -> str:
    return "TRK-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


async def log_audit(action: str, user: Optional[User] = None, resource: Optional[str] = None,
                    resource_id: Optional[str] = None, metadata: Optional[dict] = None):
    entry = AuditLog(
        organization_id=user.organization_id if user else None,
        actor_user_id=user.id if user else None,
        actor_email=user.email if user else None,
        action=action,
        resource=resource,
        resource_id=resource_id,
        metadata=metadata,
    )
    await db.audit_logs.insert_one(entry.model_dump())


def public_user(u: User) -> UserPublic:
    return UserPublic(**u.model_dump(exclude={"hashed_password"}))


async def _notify_customer(delivery_doc: dict) -> None:
    """Email the customer (if email known) about a delivery status change."""
    cust = await db.customers.find_one(
        {"id": delivery_doc.get("customer_id")}, {"_id": 0}
    )
    if not cust or not cust.get("email"):
        return
    await emailer.send_delivery_status_email(
        cust["email"], cust["name"], delivery_doc["tracking_code"], delivery_doc["status"]
    )


# ===================== AUTH =====================
@api.post("/auth/register", response_model=TokenResponse)
async def register_org(payload: RegisterOrgRequest):
    """Register a new organization with the first owner user."""
    existing_slug = await db.organizations.find_one({"slug": payload.org_slug.lower()})
    if existing_slug:
        raise HTTPException(status_code=400, detail="Organization slug already taken")
    existing_email = await db.users.find_one({"email": payload.owner_email.lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    org = Organization(name=payload.org_name, slug=payload.org_slug.lower())
    await db.organizations.insert_one(org.model_dump())

    user = User(
        email=payload.owner_email.lower(),
        full_name=payload.owner_full_name,
        hashed_password=hash_password(payload.password),
        roles=[Role.ORG_OWNER],
        organization_id=org.id,
        email_verified=True,
    )
    await db.users.insert_one(user.model_dump())
    await log_audit("org.created", user, "organization", org.id)

    # Verification email is best-effort (non-blocking)
    try:
        token = secrets.token_urlsafe(40)
        await db.email_tokens.insert_one({
            "token": token, "user_id": user.id, "type": "verify",
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        })
        await emailer.send_verification_email(user.email, user.full_name, token)
    except Exception:
        pass

    access = create_access_token(user.id, org.id, [r.value for r in user.roles])
    return TokenResponse(access_token=access, user=public_user(user), organization=org)


@api.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    doc = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = User(**doc)
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is deactivated")
    # Email verification temporarily bypassed

    org_doc = None
    if user.organization_id:
        org_doc = await db.organizations.find_one({"id": user.organization_id}, {"_id": 0})

    access = create_access_token(user.id, user.organization_id, [r.value for r in user.roles])
    await log_audit("auth.login", user)
    return TokenResponse(
        access_token=access,
        user=public_user(user),
        organization=Organization(**org_doc) if org_doc else None,
    )


@api.post("/auth/verify-email")
async def verify_email(payload: VerifyEmailRequest):
    rec = await db.email_tokens.find_one({"token": payload.token, "type": "verify"})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or used token")
    if rec["expires_at"] < datetime.now(timezone.utc).isoformat():
        await db.email_tokens.delete_one({"token": payload.token})
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"email_verified": True}})
    await db.email_tokens.delete_one({"token": payload.token})
    return {"ok": True}


@api.post("/auth/resend-verification")
async def resend_verification(payload: ResendVerificationRequest):
    doc = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not doc:
        return {"ok": True}  # don't leak
    if doc.get("email_verified"):
        return {"ok": True}
    await db.email_tokens.delete_many({"user_id": doc["id"], "type": "verify"})
    token = secrets.token_urlsafe(40)
    await db.email_tokens.insert_one({
        "token": token, "user_id": doc["id"], "type": "verify",
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
    })
    await emailer.send_verification_email(doc["email"], doc["full_name"], token)
    return {"ok": True}


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    doc = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if doc:
        token = secrets.token_urlsafe(40)
        await db.email_tokens.insert_one({
            "token": token, "user_id": doc["id"], "type": "reset",
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        })
        await emailer.send_password_reset_email(doc["email"], doc["full_name"], token)
    return {"ok": True}  # never reveal


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    rec = await db.email_tokens.find_one({"token": payload.token, "type": "reset"})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or used token")
    if rec["expires_at"] < datetime.now(timezone.utc).isoformat():
        await db.email_tokens.delete_one({"token": payload.token})
        raise HTTPException(status_code=400, detail="Token expired")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    await db.users.update_one(
        {"id": rec["user_id"]}, {"$set": {"hashed_password": hash_password(payload.password)}}
    )
    await db.email_tokens.delete_one({"token": payload.token})
    return {"ok": True}


@api.get("/auth/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return public_user(user)


@api.get("/auth/organization", response_model=Optional[Organization])
async def my_organization(user: User = Depends(get_current_user)):
    if not user.organization_id:
        return None
    org = await db.organizations.find_one({"id": user.organization_id}, {"_id": 0})
    return Organization(**org) if org else None


# ===================== ORG / USERS =====================
@api.patch("/organization", response_model=Organization)
async def update_org(payload: OrganizationUpdate,
                     user: User = Depends(require_roles([Role.ORG_OWNER]))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.organizations.update_one({"id": user.organization_id}, {"$set": updates})
    org = await db.organizations.find_one({"id": user.organization_id}, {"_id": 0})
    await log_audit("org.updated", user, "organization", user.organization_id, updates)
    return Organization(**org)


@api.get("/users", response_model=List[UserPublic])
async def list_users(user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    cursor = db.users.find(tenant_scope(user), {"_id": 0})
    return [public_user(User(**d)) async for d in cursor]


@api.post("/users/invite", response_model=UserPublic)
async def invite_user(payload: InviteUserRequest,
                      user: User = Depends(require_roles([Role.ORG_OWNER]))):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    new_user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        roles=payload.roles,
        organization_id=user.organization_id,
        phone=payload.phone,
        email_verified=True,  # invited users are pre-verified by their owner
    )
    await db.users.insert_one(new_user.model_dump())
    await log_audit("user.invited", user, "user", new_user.id)
    return public_user(new_user)


@api.delete("/users/{user_id}")
async def delete_user(user_id: str,
                      user: User = Depends(require_roles([Role.ORG_OWNER]))):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    res = await db.users.delete_one({"id": user_id, "organization_id": user.organization_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_audit("user.deleted", user, "user", user_id)
    return {"ok": True}


# ===================== VEHICLES =====================
@api.get("/vehicles", response_model=List[Vehicle])
async def list_vehicles(user: User = Depends(get_current_user)):
    cursor = db.vehicles.find(tenant_scope(user), {"_id": 0})
    return [Vehicle(**d) async for d in cursor]


@api.post("/vehicles", response_model=Vehicle)
async def create_vehicle(payload: VehicleCreate,
                         user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    v = Vehicle(organization_id=user.organization_id, **payload.model_dump())
    await db.vehicles.insert_one(v.model_dump())
    await log_audit("vehicle.created", user, "vehicle", v.id)
    return v


@api.patch("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, payload: VehicleUpdate,
                         user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    res = await db.vehicles.update_one(
        {"id": vehicle_id, "organization_id": user.organization_id}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    doc = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    await log_audit("vehicle.updated", user, "vehicle", vehicle_id, updates)
    return Vehicle(**doc)


@api.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str,
                         user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    res = await db.vehicles.delete_one({"id": vehicle_id, "organization_id": user.organization_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    await log_audit("vehicle.deleted", user, "vehicle", vehicle_id)
    return {"ok": True}


# ===================== DRIVERS =====================
@api.get("/drivers", response_model=List[Driver])
async def list_drivers(user: User = Depends(get_current_user)):
    cursor = db.drivers.find(tenant_scope(user), {"_id": 0})
    return [Driver(**d) async for d in cursor]


@api.post("/drivers", response_model=Driver)
async def create_driver(payload: DriverCreate,
                        user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    d = Driver(organization_id=user.organization_id, **payload.model_dump())
    await db.drivers.insert_one(d.model_dump())
    await log_audit("driver.created", user, "driver", d.id)
    return d


@api.patch("/drivers/{driver_id}", response_model=Driver)
async def update_driver(driver_id: str, payload: DriverUpdate,
                        user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    res = await db.drivers.update_one(
        {"id": driver_id, "organization_id": user.organization_id}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    doc = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    await log_audit("driver.updated", user, "driver", driver_id, updates)
    return Driver(**doc)


@api.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str,
                        user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    res = await db.drivers.delete_one({"id": driver_id, "organization_id": user.organization_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    await log_audit("driver.deleted", user, "driver", driver_id)
    return {"ok": True}


@api.post("/drivers/{driver_id}/location")
async def update_driver_location(driver_id: str, loc: LocationUpdate,
                                 user: User = Depends(get_current_user)):
    """Driver updates own location, or ops can update on behalf."""
    res = await db.drivers.update_one(
        {"id": driver_id, "organization_id": user.organization_id},
        {"$set": {"current_lat": loc.lat, "current_lng": loc.lng, "last_location_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"ok": True}


# ===================== CUSTOMERS =====================
@api.get("/customers", response_model=List[Customer])
async def list_customers(user: User = Depends(get_current_user)):
    cursor = db.customers.find(tenant_scope(user), {"_id": 0})
    return [Customer(**d) async for d in cursor]


@api.post("/customers", response_model=Customer)
async def create_customer(payload: CustomerCreate,
                          user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    c = Customer(organization_id=user.organization_id, **payload.model_dump())
    await db.customers.insert_one(c.model_dump())
    await log_audit("customer.created", user, "customer", c.id)
    return c


@api.patch("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, payload: CustomerUpdate,
                          user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    res = await db.customers.update_one(
        {"id": customer_id, "organization_id": user.organization_id}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    doc = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return Customer(**doc)


@api.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str,
                          user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    res = await db.customers.delete_one({"id": customer_id, "organization_id": user.organization_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"ok": True}


# ===================== DELIVERIES =====================
@api.get("/deliveries", response_model=List[Delivery])
async def list_deliveries(
    status: Optional[DeliveryStatus] = None,
    driver_id: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    f = tenant_scope(user)
    # If user is a DRIVER, only show their assigned deliveries
    if Role.DRIVER.value in [r.value if isinstance(r, Role) else r for r in user.roles] \
            and Role.ORG_OWNER.value not in [r.value if isinstance(r, Role) else r for r in user.roles]:
        # Find driver record by user_id
        drv = await db.drivers.find_one({"user_id": user.id}, {"_id": 0})
        if drv:
            f["assigned_driver_id"] = drv["id"]
        else:
            return []
    if status:
        f["status"] = status.value
    if driver_id:
        f["assigned_driver_id"] = driver_id
    cursor = db.deliveries.find(f, {"_id": 0}).sort("created_at", -1)
    return [Delivery(**d) async for d in cursor]


@api.post("/deliveries", response_model=Delivery)
async def create_delivery(payload: DeliveryCreate,
                          user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    # Resolve customer: either by id, or create inline / save to directory
    if payload.customer_id:
        cust = await db.customers.find_one(
            {"id": payload.customer_id, "organization_id": user.organization_id}, {"_id": 0}
        )
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found")
        customer_id = cust["id"]
        customer_name = cust["name"]
    else:
        if not payload.customer_name or not payload.customer_phone:
            raise HTTPException(status_code=400, detail="customer_id OR (customer_name + customer_phone) required")
        if payload.save_customer:
            existing = await db.customers.find_one(
                {"organization_id": user.organization_id, "phone": payload.customer_phone}, {"_id": 0}
            )
            if existing:
                customer_id = existing["id"]; customer_name = existing["name"]
            else:
                new_cust = Customer(
                    organization_id=user.organization_id,
                    name=payload.customer_name, phone=payload.customer_phone,
                    email=payload.customer_email,
                )
                await db.customers.insert_one(new_cust.model_dump())
                customer_id = new_cust.id; customer_name = new_cust.name
        else:
            # temporary customer record (still saved for tracking)
            new_cust = Customer(
                organization_id=user.organization_id,
                name=payload.customer_name, phone=payload.customer_phone,
                email=payload.customer_email,
                notes="[temporary - created from booking]",
            )
            await db.customers.insert_one(new_cust.model_dump())
            customer_id = new_cust.id; customer_name = new_cust.name

    data = payload.model_dump(exclude={"customer_id", "customer_name", "customer_phone",
                                       "customer_email", "save_customer"})
    d = Delivery(
        organization_id=user.organization_id,
        tracking_code=gen_tracking_code(),
        customer_id=customer_id,
        customer_name=customer_name,
        timeline=[StatusEvent(status=DeliveryStatus.PENDING, note="Booking created")],
        **data,
    )
    await db.deliveries.insert_one(d.model_dump())
    await log_audit("delivery.created", user, "delivery", d.id,
                    {"service_type": d.service_type})
    return d


@api.get("/deliveries/{delivery_id}", response_model=Delivery)
async def get_delivery(delivery_id: str, user: User = Depends(get_current_user)):
    doc = await db.deliveries.find_one(
        {"id": delivery_id, **tenant_scope(user)}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return Delivery(**doc)


@api.post("/deliveries/{delivery_id}/assign", response_model=Delivery)
async def assign_delivery(delivery_id: str, payload: DeliveryAssign,
                          user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    drv = await db.drivers.find_one({"id": payload.driver_id, "organization_id": user.organization_id}, {"_id": 0})
    if not drv:
        raise HTTPException(status_code=404, detail="Driver not found")
    veh_id = payload.vehicle_id or drv.get("assigned_vehicle_id")
    delivery = await db.deliveries.find_one({"id": delivery_id, "organization_id": user.organization_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    event = StatusEvent(status=DeliveryStatus.ASSIGNED,
                        note=f"Assigned to {drv['full_name']}").model_dump()
    await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": {
            "assigned_driver_id": payload.driver_id,
            "assigned_vehicle_id": veh_id,
            "status": DeliveryStatus.ASSIGNED.value,
         },
         "$push": {"timeline": event}},
    )
    doc = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    await log_audit("delivery.assigned", user, "delivery", delivery_id,
                    {"driver_id": payload.driver_id})
    # In-app notification for the assigned driver user (if linked)
    if drv.get("user_id"):
        n = Notification(
            organization_id=user.organization_id,
            user_id=drv["user_id"],
            title="New delivery assigned",
            body=f"Delivery {doc['tracking_code']} is assigned to you.",
            type="info",
            link=f"/driver/deliveries/{delivery_id}",
        )
        await db.notifications.insert_one(n.model_dump())
    return Delivery(**doc)


@api.post("/deliveries/{delivery_id}/status", response_model=Delivery)
async def change_status(delivery_id: str, payload: DeliveryStatusChange,
                        user: User = Depends(get_current_user)):
    delivery = await db.deliveries.find_one(
        {"id": delivery_id, **tenant_scope(user)}, {"_id": 0}
    )
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    event = StatusEvent(status=payload.status, note=payload.note,
                        lat=payload.lat, lng=payload.lng).model_dump()
    update = {"status": payload.status.value}
    if payload.status == DeliveryStatus.DELIVERED:
        update["delivered_at"] = now_iso()
    await db.deliveries.update_one(
        {"id": delivery_id}, {"$set": update, "$push": {"timeline": event}}
    )
    doc = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    await log_audit("delivery.status_changed", user, "delivery", delivery_id,
                    {"status": payload.status.value})
    # Email customer on key transitions
    if payload.status in (DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.DELIVERED, DeliveryStatus.FAILED):
        await _notify_customer(doc)
    return Delivery(**doc)


@api.post("/deliveries/{delivery_id}/pod", response_model=Delivery)
async def submit_pod(delivery_id: str, payload: PODSubmit,
                     user: User = Depends(get_current_user)):
    delivery = await db.deliveries.find_one(
        {"id": delivery_id, **tenant_scope(user)}, {"_id": 0}
    )
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    event = StatusEvent(status=DeliveryStatus.DELIVERED,
                        note="Proof of delivery submitted",
                        lat=payload.lat, lng=payload.lng).model_dump()
    await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": {
            "pod_photo_url": payload.pod_photo_url,
            "pod_signature": payload.pod_signature,
            "pod_notes": payload.pod_notes,
            "status": DeliveryStatus.DELIVERED.value,
            "delivered_at": now_iso(),
         },
         "$push": {"timeline": event}},
    )
    if delivery.get("assigned_driver_id"):
        await db.drivers.update_one(
            {"id": delivery["assigned_driver_id"]},
            {"$inc": {"deliveries_completed": 1}},
        )
    doc = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    await log_audit("delivery.pod_submitted", user, "delivery", delivery_id)
    await _notify_customer(doc)
    return Delivery(**doc)


@api.delete("/deliveries/{delivery_id}")
async def delete_delivery(delivery_id: str,
                          user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    res = await db.deliveries.delete_one({"id": delivery_id, "organization_id": user.organization_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return {"ok": True}


# ===================== PUBLIC TRACKING =====================
@api.get("/track/{tracking_code}")
async def public_track(tracking_code: str):
    doc = await db.deliveries.find_one({"tracking_code": tracking_code}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Tracking code not found")
    driver = None
    if doc.get("assigned_driver_id"):
        drv = await db.drivers.find_one({"id": doc["assigned_driver_id"]}, {"_id": 0})
        if drv:
            driver = {
                "full_name": drv["full_name"],
                "phone": drv.get("phone"),
                "rating": drv.get("rating"),
                "current_lat": drv.get("current_lat"),
                "current_lng": drv.get("current_lng"),
                "last_location_at": drv.get("last_location_at"),
            }
    return {
        "tracking_code": doc["tracking_code"],
        "status": doc["status"],
        "customer_name": doc["customer_name"],
        "pickup_address": doc["pickup_address"],
        "drop_address": doc["drop_address"],
        "drop_lat": doc.get("drop_lat"),
        "drop_lng": doc.get("drop_lng"),
        "pickup_lat": doc.get("pickup_lat"),
        "pickup_lng": doc.get("pickup_lng"),
        "timeline": doc.get("timeline", []),
        "delivered_at": doc.get("delivered_at"),
        "created_at": doc["created_at"],
        "driver": driver,
        "eta": doc.get("eta"),
    }


# ===================== DASHBOARD =====================
@api.get("/dashboard/summary")
async def dashboard_summary(user: User = Depends(get_current_user)):
    scope = tenant_scope(user)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    deliveries_today = await db.deliveries.count_documents({**scope, "created_at": {"$gte": today_start}})
    active_drivers = await db.drivers.count_documents({**scope, "status": {"$in": ["available", "on_trip"]}})
    total_drivers = await db.drivers.count_documents(scope)
    total_vehicles = await db.vehicles.count_documents(scope)
    vehicles_available = await db.vehicles.count_documents({**scope, "status": "available"})
    pending = await db.deliveries.count_documents({**scope, "status": "pending"})
    in_transit = await db.deliveries.count_documents({**scope, "status": {"$in": ["assigned", "picked_up", "in_transit", "out_for_delivery"]}})
    delivered_today = await db.deliveries.count_documents({**scope, "status": "delivered", "delivered_at": {"$gte": today_start}})
    failed_today = await db.deliveries.count_documents({**scope, "status": "failed", "created_at": {"$gte": today_start}})

    # 7-day delivery trend
    trend = []
    now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).isoformat()
        day_end = (now - timedelta(days=i - 1)).isoformat()
        count = await db.deliveries.count_documents({**scope, "created_at": {"$gte": day_start, "$lt": day_end}})
        delivered = await db.deliveries.count_documents({**scope, "delivered_at": {"$gte": day_start, "$lt": day_end}})
        trend.append({
            "day": (now - timedelta(days=i)).strftime("%a"),
            "created": count,
            "delivered": delivered,
        })

    # status breakdown
    pipeline = [{"$match": scope}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_breakdown = []
    async for row in db.deliveries.aggregate(pipeline):
        status_breakdown.append({"status": row["_id"], "count": row["count"]})

    # estimated revenue (sum of cod_amount delivered)
    rev_pipeline = [
        {"$match": {**scope, "status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$cod_amount"}}}
    ]
    revenue = 0.0
    async for row in db.deliveries.aggregate(rev_pipeline):
        revenue = row.get("total", 0) or 0

    return {
        "deliveries_today": deliveries_today,
        "active_drivers": active_drivers,
        "total_drivers": total_drivers,
        "total_vehicles": total_vehicles,
        "vehicles_available": vehicles_available,
        "pending": pending,
        "in_transit": in_transit,
        "delivered_today": delivered_today,
        "failed_today": failed_today,
        "trend": trend,
        "status_breakdown": status_breakdown,
        "revenue": revenue,
    }


# ===================== NOTIFICATIONS =====================
@api.get("/notifications", response_model=List[Notification])
async def list_notifications(user: User = Depends(get_current_user)):
    f = {"organization_id": user.organization_id,
         "$or": [{"user_id": user.id}, {"user_id": None}]}
    cursor = db.notifications.find(f, {"_id": 0}).sort("created_at", -1).limit(50)
    return [Notification(**d) async for d in cursor]


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: User = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": nid, "organization_id": user.organization_id}, {"$set": {"is_read": True}}
    )
    return {"ok": True}


# ===================== AUDIT LOGS =====================
@api.get("/audit-logs", response_model=List[AuditLog])
async def list_audit(user: User = Depends(require_roles([Role.ORG_OWNER]))):
    cursor = db.audit_logs.find(tenant_scope(user), {"_id": 0}).sort("created_at", -1).limit(200)
    return [AuditLog(**d) async for d in cursor]


# ===================== GEOCODING (OSM Nominatim) =====================
import httpx  # noqa: E402

_geo_cache: dict[str, list] = {}


@api.get("/geocode")
async def geocode(q: str = Query(..., min_length=3),
                  user: User = Depends(get_current_user)):
    """Proxy to OpenStreetMap Nominatim - free, no key. Cached in-process."""
    key = q.strip().lower()
    if key in _geo_cache:
        return {"results": _geo_cache[key]}
    try:
        async with httpx.AsyncClient(timeout=6) as c:
            r = await c.get(
                "https://photon.komoot.io/api/",
                params={"q": q, "limit": 6},
                headers={"User-Agent": "Mozilla/5.0 FleetGrid"},
            )
        data = r.json() if r.status_code == 200 else {}
        feats = data.get("features", [])
    except Exception:
        feats = []
    results = []
    for f in feats:
        props = f.get("properties", {})
        coords = (f.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        lng, lat = coords[0], coords[1]
        label = ", ".join([x for x in [
            props.get("name"), props.get("street"), props.get("city"),
            props.get("state"), props.get("country"),
        ] if x])
        results.append({
            "label": label or props.get("name") or f"{lat},{lng}",
            "lat": float(lat), "lng": float(lng),
            "type": props.get("type"),
            "city": props.get("city") or props.get("town") or props.get("village"),
            "importance": 0,
        })
    _geo_cache[key] = results
    return {"results": results}


# ===================== BILLING / RAZORPAY =====================
@api.get("/billing/plans")
async def list_plans():
    return {"plans": PLANS, "key_id": RZP_KEY_ID}


@api.post("/billing/create-order")
async def create_billing_order(payload: PlanChoice,
                               user: User = Depends(require_roles([Role.ORG_OWNER]))):
    if not rzp:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    plan = PLANS.get(payload.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Unknown plan")
    receipt = f"org-{user.organization_id[:8]}-{secrets.token_hex(4)}"
    try:
        order = await asyncio.to_thread(
            rzp.order.create,
            {"amount": plan["price_inr"] * 100, "currency": "INR",
             "receipt": receipt[:40], "payment_capture": 1,
             "notes": {"organization_id": user.organization_id, "plan": payload.plan}},
        )
    except Exception as e:
        logger.error(f"Razorpay order create failed: {e}")
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {e}")
    await db.billing_orders.insert_one({
        "order_id": order["id"], "organization_id": user.organization_id,
        "plan": payload.plan, "amount": plan["price_inr"], "status": "created",
        "created_at": now_iso(),
    })
    return {
        "order_id": order["id"], "amount": order["amount"], "currency": order["currency"],
        "key_id": RZP_KEY_ID, "plan": payload.plan, "plan_name": plan["name"],
    }


@api.post("/billing/verify")
async def verify_payment(payload: RazorpayVerify,
                         user: User = Depends(require_roles([Role.ORG_OWNER]))):
    if not rzp:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    try:
        rzp.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    await db.billing_orders.update_one(
        {"order_id": payload.razorpay_order_id, "organization_id": user.organization_id},
        {"$set": {"status": "paid", "payment_id": payload.razorpay_payment_id,
                  "paid_at": now_iso()}},
    )
    await db.organizations.update_one(
        {"id": user.organization_id}, {"$set": {"plan": payload.plan}}
    )
    await log_audit("billing.upgraded", user, "organization", user.organization_id,
                    {"plan": payload.plan})
    return {"ok": True, "plan": payload.plan}


@api.get("/billing/history")
async def billing_history(user: User = Depends(require_roles([Role.ORG_OWNER]))):
    cursor = db.billing_orders.find(
        {"organization_id": user.organization_id}, {"_id": 0}
    ).sort("created_at", -1)
    return [d async for d in cursor]


# ===================== HEALTH =====================
@api.get("/")
async def root():
    return {"status": "ok", "service": "fleet-saas-api"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.organizations.create_index("slug", unique=True)
    await db.users.create_index("email", unique=True)
    await db.deliveries.create_index("tracking_code", unique=True)
    await db.deliveries.create_index([("organization_id", 1), ("created_at", -1)])
    await db.vehicles.create_index([("organization_id", 1)])
    await db.drivers.create_index([("organization_id", 1)])
    await db.customers.create_index([("organization_id", 1)])
    await db.email_tokens.create_index("token", unique=True)
    await db.email_tokens.create_index("expires_at")

    # Migration: ensure existing users have email_verified field
    await db.users.update_many(
        {"email_verified": {"$exists": False}}, {"$set": {"email_verified": True}}
    )
    # Verification bypass: mark all users verified (Feb 2026 — until SMTP issue resolved)
    await db.users.update_many({"email_verified": False}, {"$set": {"email_verified": True}})

    # Seed demo data if empty
    if await db.organizations.count_documents({}) == 0:
        await _seed_demo()


async def _seed_demo():
    """Seed a demo org with users, drivers, vehicles, customers and deliveries."""
    org = Organization(name="Acme Logistics", slug="acme")
    await db.organizations.insert_one(org.model_dump())

    owner = User(
        email="owner@acme.com",
        full_name="Olivia Owner",
        hashed_password=hash_password("Password123!"),
        roles=[Role.ORG_OWNER],
        organization_id=org.id,
        phone="+1-555-0100",
        email_verified=True,
    )
    dispatcher = User(
        email="dispatcher@acme.com",
        full_name="Dan Dispatch",
        hashed_password=hash_password("Password123!"),
        roles=[Role.DISPATCHER],
        organization_id=org.id,
        email_verified=True,
    )
    drv_user = User(
        email="driver@acme.com",
        full_name="Diego Driver",
        hashed_password=hash_password("Password123!"),
        roles=[Role.DRIVER],
        organization_id=org.id,
        email_verified=True,
    )
    cust_user = User(
        email="customer@acme.com",
        full_name="Carla Customer",
        hashed_password=hash_password("Password123!"),
        roles=[Role.CUSTOMER],
        organization_id=org.id,
        email_verified=True,
    )
    await db.users.insert_many([owner.model_dump(), dispatcher.model_dump(),
                                drv_user.model_dump(), cust_user.model_dump()])

    # Vehicles
    vehicles = [
        Vehicle(organization_id=org.id, registration_number="MH-12-AB-1234", vehicle_type="van",
                capacity_kg=500, fuel_type="diesel", status="available"),
        Vehicle(organization_id=org.id, registration_number="MH-14-CD-5678", vehicle_type="truck",
                capacity_kg=2000, fuel_type="diesel", status="available"),
        Vehicle(organization_id=org.id, registration_number="MH-01-EV-9999", vehicle_type="bike",
                capacity_kg=30, fuel_type="ev", status="available"),
    ]
    for v in vehicles:
        await db.vehicles.insert_one(v.model_dump())

    # Drivers
    drivers = [
        Driver(organization_id=org.id, user_id=drv_user.id, full_name="Diego Driver",
               phone="+1-555-0200", email="driver@acme.com", license_number="DL-X-9001",
               assigned_vehicle_id=vehicles[0].id, status="available", rating=4.8,
               current_lat=19.0760, current_lng=72.8777),
        Driver(organization_id=org.id, full_name="Maria Hernandez",
               phone="+1-555-0201", license_number="DL-X-9002",
               assigned_vehicle_id=vehicles[1].id, status="on_trip", rating=4.6,
               current_lat=19.0896, current_lng=72.8656),
        Driver(organization_id=org.id, full_name="Sam O'Connor",
               phone="+1-555-0202", license_number="DL-X-9003",
               assigned_vehicle_id=vehicles[2].id, status="available", rating=4.9,
               current_lat=19.0330, current_lng=72.8570),
    ]
    for d in drivers:
        await db.drivers.insert_one(d.model_dump())

    # Customers
    customers = [
        Customer(organization_id=org.id, name="Stark Industries", email="ops@stark.com",
                 phone="+1-555-0300", address="200 Park Ave, Mumbai", company="Stark Industries"),
        Customer(organization_id=org.id, name="Wayne Enterprises", email="biz@wayne.com",
                 phone="+1-555-0301", address="1007 Mountain Drive, Mumbai", company="Wayne Enterprises"),
        Customer(organization_id=org.id, name="Pied Piper", email="hi@piedpiper.com",
                 phone="+1-555-0302", address="5230 Newell Rd, Mumbai", company="Pied Piper"),
    ]
    for c in customers:
        await db.customers.insert_one(c.model_dump())

    # Deliveries
    statuses = [DeliveryStatus.PENDING, DeliveryStatus.ASSIGNED,
                DeliveryStatus.IN_TRANSIT, DeliveryStatus.OUT_FOR_DELIVERY,
                DeliveryStatus.DELIVERED, DeliveryStatus.DELIVERED]
    coords = [
        (19.0760, 72.8777, 19.2183, 72.9781),
        (19.0330, 72.8570, 19.1136, 72.8697),
        (19.0760, 72.8777, 18.9220, 72.8347),
        (19.0896, 72.8656, 19.0330, 72.8570),
        (19.0760, 72.8777, 19.2183, 72.9781),
        (19.0760, 72.8777, 19.1136, 72.8697),
    ]
    for i, st in enumerate(statuses):
        c = random.choice(customers)
        drv = random.choice(drivers)
        d = Delivery(
            organization_id=org.id,
            tracking_code=gen_tracking_code(),
            customer_id=c.id,
            customer_name=c.name,
            pickup_address="Acme Warehouse, Andheri East, Mumbai",
            pickup_lat=coords[i][0], pickup_lng=coords[i][1],
            drop_address=c.address or "Mumbai",
            drop_lat=coords[i][2], drop_lng=coords[i][3],
            priority=random.choice(["normal", "high", "urgent"]),
            package_description=random.choice(["Electronics", "Documents", "Fresh produce", "Apparel"]),
            weight_kg=random.uniform(1, 50),
            cod_amount=random.choice([0, 0, 1200, 2500, 4900]),
            status=st,
            assigned_driver_id=drv.id if st != DeliveryStatus.PENDING else None,
            assigned_vehicle_id=drv.assigned_vehicle_id if st != DeliveryStatus.PENDING else None,
            timeline=[StatusEvent(status=DeliveryStatus.PENDING, note="Created")],
            delivered_at=now_iso() if st == DeliveryStatus.DELIVERED else None,
        )
        await db.deliveries.insert_one(d.model_dump())

    logger.info(f"Seeded demo organization {org.slug}")


@app.on_event("shutdown")
async def shutdown():
    client.close()

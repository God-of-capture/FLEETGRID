"""Pydantic models for the Fleet & Delivery Management SaaS."""
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
import uuid


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ORG_OWNER = "org_owner"
    OPS_MANAGER = "ops_manager"
    DISPATCHER = "dispatcher"
    DRIVER = "driver"
    CUSTOMER = "customer"


class DeliveryStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ============ Organization ============
class Organization(BaseModel):
    id: str = Field(default_factory=_id)
    name: str
    slug: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    plan: str = "trial"
    is_active: bool = True
    created_at: str = Field(default_factory=_now)


class OrganizationCreate(BaseModel):
    name: str
    slug: str


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    plan: Optional[str] = None


# ============ User ============
class User(BaseModel):
    id: str = Field(default_factory=_id)
    email: EmailStr
    full_name: str
    hashed_password: str
    roles: List[Role] = [Role.CUSTOMER]
    organization_id: Optional[str] = None  # None for super_admin
    is_active: bool = True
    email_verified: bool = False
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    roles: List[Role]
    organization_id: Optional[str] = None
    is_active: bool
    email_verified: bool = False
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str


class RegisterOrgRequest(BaseModel):
    org_name: str
    org_slug: str
    owner_email: EmailStr
    owner_full_name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
    organization: Optional[Organization] = None


class InviteUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    roles: List[Role]
    phone: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class PlanChoice(BaseModel):
    plan: str  # starter | growth | enterprise


class RazorpayVerify(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    plan: str


# ============ Vehicle ============
class Vehicle(BaseModel):
    id: str = Field(default_factory=_id)
    organization_id: str
    registration_number: str
    vehicle_type: str  # van, truck, bike, car
    capacity_kg: float = 0
    fuel_type: str = "petrol"  # petrol, diesel, ev, cng
    insurance_expiry: Optional[str] = None
    last_service_date: Optional[str] = None
    next_service_date: Optional[str] = None
    status: str = "available"  # available, in_use, maintenance, retired
    assigned_driver_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class VehicleCreate(BaseModel):
    registration_number: str
    vehicle_type: str
    capacity_kg: float = 0
    fuel_type: str = "petrol"
    insurance_expiry: Optional[str] = None
    notes: Optional[str] = None


class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    capacity_kg: Optional[float] = None
    fuel_type: Optional[str] = None
    insurance_expiry: Optional[str] = None
    status: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    notes: Optional[str] = None


# ============ Driver ============
class Driver(BaseModel):
    id: str = Field(default_factory=_id)
    organization_id: str
    user_id: Optional[str] = None  # link to User if portal access
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    license_number: str
    license_expiry: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: str = "available"  # available, on_trip, off_duty
    assigned_vehicle_id: Optional[str] = None
    rating: float = 5.0
    deliveries_completed: int = 0
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_location_at: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class DriverCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    license_number: str
    license_expiry: Optional[str] = None
    emergency_contact: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None


class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    emergency_contact: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    status: Optional[str] = None


class LocationUpdate(BaseModel):
    lat: float
    lng: float


# ============ Customer ============
class Customer(BaseModel):
    id: str = Field(default_factory=_id)
    organization_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None


# ============ Delivery ============
class StatusEvent(BaseModel):
    status: DeliveryStatus
    at: str = Field(default_factory=_now)
    note: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class Delivery(BaseModel):
    id: str = Field(default_factory=_id)
    organization_id: str
    tracking_code: str
    customer_id: str
    customer_name: str
    service_type: str = "shipping"
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_address: str
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None
    assigned_driver_id: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent
    package_description: Optional[str] = None
    weight_kg: float = 0
    cod_amount: float = 0
    instructions: Optional[str] = None
    journey_date: Optional[str] = None
    journey_time: Optional[str] = None
    passengers: Optional[int] = None
    round_trip: bool = False
    return_date: Optional[str] = None
    status: DeliveryStatus = DeliveryStatus.PENDING
    timeline: List[StatusEvent] = []
    eta: Optional[str] = None
    pod_photo_url: Optional[str] = None
    pod_signature: Optional[str] = None
    pod_notes: Optional[str] = None
    created_at: str = Field(default_factory=_now)
    delivered_at: Optional[str] = None


class DeliveryCreate(BaseModel):
    customer_id: Optional[str] = None
    # Inline customer (used when customer_id not provided)
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    save_customer: bool = False
    # Service type: shipping (parcel) or travel (passenger)
    service_type: str = "shipping"  # shipping | travel
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_address: str
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None
    priority: str = "normal"
    package_description: Optional[str] = None
    weight_kg: float = 0
    cod_amount: float = 0
    instructions: Optional[str] = None
    # Travel-only
    journey_date: Optional[str] = None
    journey_time: Optional[str] = None
    passengers: Optional[int] = None
    round_trip: bool = False
    return_date: Optional[str] = None


class DeliveryAssign(BaseModel):
    driver_id: str
    vehicle_id: Optional[str] = None


class DeliveryStatusChange(BaseModel):
    status: DeliveryStatus
    note: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class PODSubmit(BaseModel):
    pod_photo_url: Optional[str] = None
    pod_signature: Optional[str] = None
    pod_notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


# ============ Notification ============
class Notification(BaseModel):
    id: str = Field(default_factory=_id)
    organization_id: str
    user_id: Optional[str] = None  # None means org-wide
    title: str
    body: str
    type: str = "info"  # info, success, warning, error
    is_read: bool = False
    link: Optional[str] = None
    created_at: str = Field(default_factory=_now)


# ============ Audit log ============
class AuditLog(BaseModel):
    id: str = Field(default_factory=_id)
    organization_id: Optional[str] = None
    actor_user_id: Optional[str] = None
    actor_email: Optional[str] = None
    action: str
    resource: Optional[str] = None
    resource_id: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: str = Field(default_factory=_now)

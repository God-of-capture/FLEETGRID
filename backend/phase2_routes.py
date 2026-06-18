"""Phase 2 API routes — onboarding, verification, offers, pickup, ratings."""
import math
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pymongo import ReturnDocument

from auth import get_current_user, require_roles, tenant_scope
from models import (
    CustomerRatingSubmit, Delivery, DeliveryOffer, DeliveryRating, DeliveryStatus,
    DocumentType, DocumentVerificationStatus, Driver, DriverCreate, DriverRatingSubmit,
    OfferAction, OfferDeliveryRequest, OfferStatus, OnboardingReviewAction,
    OnboardingStepUpdate, PaginatedResponse, PartnerOnboarding, PickupConfirm,
    PODSubmit, Role, User, VerificationDocument, VerificationStatus,
)
from phase2_services import (
    accept_offer_atomic, create_offers_for_delivery, expire_stale_offers,
    now_iso, push_notification, timeline_event, update_driver_rating_aggregates,
)
from storage import get_storage, validate_upload

router = APIRouter()

ALLOWED_DOC_TYPES = {d.value for d in DocumentType}
STEP_FIELDS = {
    1: ["full_name", "email", "phone", "date_of_birth"],
    2: ["address_line", "city", "state", "postal_code"],
    3: ["id_number", "id_type"],
    5: ["vehicle_type", "registration_number", "capacity_kg", "license_number"],
}


def _db():
    from server import db
    return db


def _log_audit():
    from server import log_audit
    return log_audit


def _paginate(items: list, total: int, page: int, page_size: int) -> PaginatedResponse:
    pages = max(1, math.ceil(total / page_size))
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


async def _get_onboarding_for_user(user: User) -> Optional[dict]:
    db = _db()
    return await db.partner_onboarding.find_one(
        {"user_id": user.id, "organization_id": user.organization_id}, {"_id": 0},
    )


# ===================== ONBOARDING =====================

@router.get("/partner/onboarding/me", response_model=PartnerOnboarding)
async def get_my_onboarding(user: User = Depends(get_current_user)):
    doc = await _get_onboarding_for_user(user)
    if not doc:
        ob = PartnerOnboarding(organization_id=user.organization_id, user_id=user.id,
                               full_name=user.full_name, email=user.email, phone=user.phone)
        await _db().partner_onboarding.insert_one(ob.model_dump())
        return ob
    return PartnerOnboarding(**doc)


@router.patch("/partner/onboarding/step", response_model=PartnerOnboarding)
async def save_onboarding_step(payload: OnboardingStepUpdate,
                               user: User = Depends(get_current_user)):
    if payload.step not in (1, 2, 3, 5):
        raise HTTPException(status_code=400, detail="Invalid step; use upload endpoints for document steps")
    allowed = STEP_FIELDS.get(payload.step, [])
    update = {k: v for k, v in payload.data.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields for this step")
    update["current_step"] = max(payload.step, 1)
    update["updated_at"] = now_iso()
    doc = await _db().partner_onboarding.find_one_and_update(
        {"user_id": user.id, "organization_id": user.organization_id},
        {"$set": update, "$setOnInsert": {
            "id": PartnerOnboarding(organization_id=user.organization_id, user_id=user.id).id,
            "organization_id": user.organization_id, "user_id": user.id,
            "verification_status": VerificationStatus.PENDING.value,
            "created_at": now_iso(),
        }},
        upsert=True, return_document=ReturnDocument.AFTER,
    )
    await _log_audit()("onboarding.step_saved", user, "partner_onboarding", doc["id"],
                       {"step": payload.step})
    return PartnerOnboarding(**doc)


@router.post("/partner/onboarding/documents", response_model=VerificationDocument)
async def upload_onboarding_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid doc_type. Allowed: {sorted(ALLOWED_DOC_TYPES)}")
    ob = await _get_onboarding_for_user(user)
    if not ob:
        raise HTTPException(status_code=400, detail="Start onboarding first")
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    try:
        validate_upload(content_type, len(data))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    storage = get_storage()
    import io
    key, url = await storage.save(io.BytesIO(data), file.filename or "upload", content_type)
    doc = VerificationDocument(
        organization_id=user.organization_id,
        owner_user_id=user.id,
        onboarding_id=ob["id"],
        doc_type=doc_type,
        storage_url=url,
        filename=file.filename or key,
        content_type=content_type,
        file_size=len(data),
    )
    await _db().verification_documents.insert_one(doc.model_dump())
    step_map = {
        DocumentType.SELFIE.value: 4, DocumentType.GOVERNMENT_ID.value: 3,
        DocumentType.RC.value: 6, DocumentType.INSURANCE.value: 6,
        DocumentType.VEHICLE_FRONT.value: 7, DocumentType.VEHICLE_REAR.value: 7,
    }
    if doc_type in step_map:
        await _db().partner_onboarding.update_one(
            {"id": ob["id"]},
            {"$set": {"current_step": step_map[doc_type], "updated_at": now_iso()}},
        )
    await _log_audit()("onboarding.document_uploaded", user, "verification_document", doc.id,
                       {"doc_type": doc_type})
    return doc


@router.get("/partner/onboarding/documents", response_model=List[VerificationDocument])
async def list_my_documents(user: User = Depends(get_current_user)):
    ob = await _get_onboarding_for_user(user)
    if not ob:
        return []
    cursor = _db().verification_documents.find(
        {"onboarding_id": ob["id"], "owner_user_id": user.id}, {"_id": 0},
    )
    return [VerificationDocument(**d) async for d in cursor]


@router.post("/partner/onboarding/submit", response_model=PartnerOnboarding)
async def submit_onboarding(user: User = Depends(get_current_user)):
    ob = await _get_onboarding_for_user(user)
    if not ob:
        raise HTTPException(status_code=400, detail="Onboarding not started")
    required = ["full_name", "phone", "address_line", "city", "id_number", "vehicle_type", "registration_number"]
    missing = [f for f in required if not ob.get(f)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {missing}")
    doc_types = set()
    async for d in _db().verification_documents.find({"onboarding_id": ob["id"]}, {"doc_type": 1}):
        doc_types.add(d["doc_type"])
    for needed in (DocumentType.SELFIE.value, DocumentType.GOVERNMENT_ID.value,
                   DocumentType.RC.value, DocumentType.INSURANCE.value):
        if needed not in doc_types:
            raise HTTPException(status_code=400, detail=f"Missing document: {needed}")
    await _db().partner_onboarding.update_one(
        {"id": ob["id"]},
        {"$set": {
            "verification_status": VerificationStatus.DOCS_REVIEW.value,
            "submitted_at": now_iso(), "current_step": 8, "updated_at": now_iso(),
        }},
    )
    await _log_audit()("onboarding.submitted", user, "partner_onboarding", ob["id"])
    await push_notification(
        _db(), user.organization_id, None,
        "Partner application submitted",
        f"{ob.get('full_name', user.full_name)} submitted onboarding for review",
        "info", "/app/verification",
    )
    doc = await _db().partner_onboarding.find_one({"id": ob["id"]}, {"_id": 0})
    return PartnerOnboarding(**doc)


# ===================== ADMIN VERIFICATION =====================

@router.get("/admin/verification/queue")
async def verification_queue(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER])),
):
    f = {**tenant_scope(user)}
    if status:
        f["verification_status"] = status
    else:
        f["verification_status"] = {"$in": [
            VerificationStatus.PENDING.value, VerificationStatus.DOCS_REVIEW.value,
        ]}
    skip = (page - 1) * page_size
    total = await _db().partner_onboarding.count_documents(f)
    cursor = _db().partner_onboarding.find(f, {"_id": 0}).sort("submitted_at", -1).skip(skip).limit(page_size)
    items = []
    async for ob in cursor:
        docs = [VerificationDocument(**d) async for d in
                _db().verification_documents.find({"onboarding_id": ob["id"]}, {"_id": 0})]
        items.append({**ob, "documents": [d.model_dump() for d in docs]})
    return _paginate(items, total, page, page_size)


@router.get("/admin/verification/{onboarding_id}")
async def get_onboarding_detail(onboarding_id: str,
                                user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    ob = await _db().partner_onboarding.find_one(
        {"id": onboarding_id, **tenant_scope(user)}, {"_id": 0},
    )
    if not ob:
        raise HTTPException(status_code=404, detail="Application not found")
    docs = [VerificationDocument(**d) async for d in
            _db().verification_documents.find({"onboarding_id": onboarding_id}, {"_id": 0})]
    return {**ob, "documents": [d.model_dump() for d in docs]}


@router.post("/admin/verification/{onboarding_id}/review", response_model=PartnerOnboarding)
async def review_onboarding(onboarding_id: str, payload: OnboardingReviewAction,
                            user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER]))):
    ob = await _db().partner_onboarding.find_one(
        {"id": onboarding_id, **tenant_scope(user)}, {"_id": 0},
    )
    if not ob:
        raise HTTPException(status_code=404, detail="Application not found")
    if payload.action not in ("approve", "reject", "request_resubmit"):
        raise HTTPException(status_code=400, detail="Invalid action")

    status_map = {
        "approve": VerificationStatus.APPROVED.value,
        "reject": VerificationStatus.REJECTED.value,
        "request_resubmit": VerificationStatus.PENDING.value,
    }
    update = {
        "verification_status": status_map[payload.action],
        "reviewer_id": user.id,
        "reviewer_email": user.email,
        "reviewed_at": now_iso(),
        "verification_notes": payload.verification_notes,
        "rejection_reason": payload.rejection_reason if payload.action == "reject" else None,
        "updated_at": now_iso(),
    }
    await _db().partner_onboarding.update_one({"id": onboarding_id}, {"$set": update})

    if payload.action == "approve":
        existing_drv = await _db().drivers.find_one({"user_id": ob["user_id"]}, {"_id": 0})
        if not existing_drv:
            drv = Driver(
                organization_id=user.organization_id,
                user_id=ob["user_id"],
                full_name=ob.get("full_name") or "Partner",
                phone=ob.get("phone") or "",
                email=ob.get("email"),
                license_number=ob.get("license_number") or ob.get("id_number") or "PENDING",
                verification_status=VerificationStatus.ACTIVE.value,
                onboarding_id=onboarding_id,
            )
            await _db().drivers.insert_one(drv.model_dump())
            if ob.get("registration_number"):
                from models import Vehicle
                veh = Vehicle(
                    organization_id=user.organization_id,
                    registration_number=ob["registration_number"],
                    vehicle_type=ob.get("vehicle_type") or "bike",
                    capacity_kg=ob.get("capacity_kg") or 0,
                    assigned_driver_id=drv.id,
                )
                await _db().vehicles.insert_one(veh.model_dump())
                await _db().drivers.update_one({"id": drv.id}, {"$set": {"assigned_vehicle_id": veh.id}})
        else:
            await _db().drivers.update_one(
                {"id": existing_drv["id"]},
                {"$set": {"verification_status": VerificationStatus.ACTIVE.value, "onboarding_id": onboarding_id}},
            )
        await _db().users.update_one(
            {"id": ob["user_id"]},
            {"$addToSet": {"roles": Role.DRIVER.value}},
        )
        await push_notification(
            _db(), user.organization_id, ob["user_id"],
            "Verification approved",
            "Your partner application has been approved. You can now accept deliveries.",
            "success", "/driver/jobs",
        )
    elif payload.action == "reject":
        await push_notification(
            _db(), user.organization_id, ob["user_id"],
            "Verification rejected",
            payload.rejection_reason or "Your application was not approved.",
            "error", "/partner/onboarding",
        )
    else:
        await push_notification(
            _db(), user.organization_id, ob["user_id"],
            "Resubmission requested",
            payload.verification_notes or "Please update your documents and resubmit.",
            "warning", "/partner/onboarding",
        )

    await _log_audit()(f"onboarding.{payload.action}", user, "partner_onboarding", onboarding_id,
                       {"notes": payload.verification_notes})
    doc = await _db().partner_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return PartnerOnboarding(**doc)


# ===================== DELIVERY OFFERS =====================

@router.post("/deliveries/{delivery_id}/offer", response_model=List[DeliveryOffer])
async def offer_delivery(delivery_id: str, payload: OfferDeliveryRequest,
                         user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    delivery = await _db().deliveries.find_one(
        {"id": delivery_id, **tenant_scope(user)}, {"_id": 0},
    )
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if delivery.get("assigned_driver_id"):
        raise HTTPException(status_code=400, detail="Delivery already assigned")
    await expire_stale_offers(_db())
    offers = await create_offers_for_delivery(
        _db(), delivery, user.organization_id,
        payload.radius_km, payload.offer_ttl_minutes, payload.max_drivers,
        _log_audit(), user,
    )
    if not offers:
        raise HTTPException(status_code=400, detail="No eligible drivers nearby")
    return offers


@router.get("/driver/jobs")
async def driver_jobs_feed(
    sort: str = Query("distance", pattern="^(distance|payout|priority|expires)$"),
    user: User = Depends(require_roles([Role.DRIVER])),
):
    await expire_stale_offers(_db())
    drv = await _db().drivers.find_one({"user_id": user.id, "organization_id": user.organization_id}, {"_id": 0})
    if not drv:
        return {"offers": [], "assigned": []}
    if drv.get("verification_status") not in (
        VerificationStatus.ACTIVE.value, VerificationStatus.APPROVED.value, "active",
    ):
        return {"offers": [], "assigned": [], "message": "Complete verification to see jobs"}

    now = now_iso()
    cursor = _db().delivery_offers.find({
        "driver_id": drv["id"],
        "organization_id": user.organization_id,
        "status": OfferStatus.PENDING.value,
        "expires_at": {"$gt": now},
    }, {"_id": 0})
    offers = []
    async for o in cursor:
        d = await _db().deliveries.find_one({"id": o["delivery_id"]}, {"_id": 0})
        if not d:
            continue
        offers.append({
            **o,
            "delivery": {
                "tracking_code": d["tracking_code"],
                "pickup_address": d["pickup_address"],
                "drop_address": d["drop_address"],
                "priority": d.get("priority"),
                "package_description": d.get("package_description"),
                "weight_kg": d.get("weight_kg"),
            },
        })
    sort_key = {
        "distance": lambda x: x.get("estimated_distance_km") or 999,
        "payout": lambda x: -(x.get("payout_estimate") or 0),
        "priority": lambda x: {"urgent": 0, "high": 1, "normal": 2, "low": 3}.get(
            x.get("delivery", {}).get("priority"), 2),
        "expires": lambda x: x.get("expires_at", ""),
    }
    offers.sort(key=sort_key.get(sort, sort_key["distance"]))

    assigned = [Delivery(**d) async for d in _db().deliveries.find(
        {"assigned_driver_id": drv["id"], "organization_id": user.organization_id,
         "status": {"$nin": ["delivered", "failed", "cancelled"]}}, {"_id": 0},
    )]
    return {"offers": offers, "assigned": [a.model_dump() for a in assigned]}


@router.post("/offers/{offer_id}/accept", response_model=Delivery)
async def accept_offer(offer_id: str, user: User = Depends(require_roles([Role.DRIVER]))):
    drv = await _db().drivers.find_one({"user_id": user.id}, {"_id": 0})
    if not drv:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    try:
        doc = await accept_offer_atomic(_db(), offer_id, drv["id"], user.organization_id, user, _log_audit())
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return Delivery(**doc)


@router.post("/offers/{offer_id}/decline")
async def decline_offer(offer_id: str, payload: OfferAction = OfferAction(),
                        user: User = Depends(require_roles([Role.DRIVER]))):
    drv = await _db().drivers.find_one({"user_id": user.id}, {"_id": 0})
    if not drv:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    res = await _db().delivery_offers.update_one(
        {"id": offer_id, "driver_id": drv["id"], "status": OfferStatus.PENDING.value},
        {"$set": {"status": OfferStatus.DECLINED.value, "declined_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    await _log_audit()("delivery.offer_declined", user, "delivery_offer", offer_id)
    return {"ok": True}


@router.post("/offers/expire-stale")
async def expire_offers(user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    count = await expire_stale_offers(_db())
    await _log_audit()("delivery.offers_expired", user, "delivery_offer", None, {"count": count})
    return {"expired": count}


# ===================== PICKUP & POD =====================

@router.post("/deliveries/{delivery_id}/pickup-confirm", response_model=Delivery)
async def confirm_pickup(delivery_id: str, payload: PickupConfirm,
                         user: User = Depends(require_roles([Role.DRIVER]))):
    delivery, drv = await _assert_assigned_driver(delivery_id, user)
    event = timeline_event(
        DeliveryStatus.PICKED_UP, payload.pickup_notes or "Pickup confirmed", "pickup_confirmed",
        payload.lat, payload.lng,
    )
    await _db().deliveries.update_one(
        {"id": delivery_id},
        {"$set": {
            "pickup_photo_url": payload.pickup_photo_url,
            "pickup_confirmed_at": now_iso(),
            "pickup_notes": payload.pickup_notes,
            "status": DeliveryStatus.PICKED_UP.value,
        },
         "$push": {"timeline": event}},
    )
    await _log_audit()("delivery.pickup_confirmed", user, "delivery", delivery_id)
    await push_notification(
        _db(), user.organization_id, None,
        "Pickup confirmed",
        f"{delivery['tracking_code']} picked up by {drv['full_name']}",
        "info", f"/app/deliveries/{delivery_id}",
    )
    doc = await _db().deliveries.find_one({"id": delivery_id}, {"_id": 0})
    return Delivery(**doc)


@router.post("/deliveries/{delivery_id}/pod/v2", response_model=Delivery)
async def submit_pod_v2(delivery_id: str, payload: PODSubmit,
                        user: User = Depends(require_roles([Role.DRIVER]))):
    delivery, drv = await _assert_assigned_driver(delivery_id, user)
    event = timeline_event(
        DeliveryStatus.DELIVERED, "Proof of delivery submitted", "delivered",
        payload.lat, payload.lng,
    )
    await _db().deliveries.update_one(
        {"id": delivery_id},
        {"$set": {
            "pod_photo_url": payload.pod_photo_url,
            "pod_signature": payload.pod_signature,
            "pod_notes": payload.pod_notes,
            "pod_qr_confirmed": payload.pod_qr_confirmed,
            "status": DeliveryStatus.DELIVERED.value,
            "delivered_at": now_iso(),
        },
         "$push": {"timeline": event}},
    )
    await _db().drivers.update_one({"id": drv["id"]}, {"$inc": {"deliveries_completed": 1},
                                    "$set": {"status": "available"}})
    await _log_audit()("delivery.pod_submitted", user, "delivery", delivery_id)
    doc = await _db().deliveries.find_one({"id": delivery_id}, {"_id": 0})
    from server import _notify_customer
    await _notify_customer(doc)
    return Delivery(**doc)


@router.post("/deliveries/{delivery_id}/upload")
async def upload_delivery_media(
    delivery_id: str,
    purpose: str = Form(...),  # pickup | pod
    file: UploadFile = File(...),
    user: User = Depends(require_roles([Role.DRIVER])),
):
    await _assert_assigned_driver(delivery_id, user)
    if purpose not in ("pickup", "pod"):
        raise HTTPException(status_code=400, detail="purpose must be pickup or pod")
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    try:
        validate_upload(content_type, len(data))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    import io
    storage = get_storage()
    key, url = await storage.save(io.BytesIO(data), file.filename or "upload", content_type)
    field = "pickup_photo_url" if purpose == "pickup" else "pod_photo_url"
    await _db().deliveries.update_one({"id": delivery_id}, {"$set": {field: url}})
    await _log_audit()("delivery.media_uploaded", user, "delivery", delivery_id, {"purpose": purpose})
    return {"url": url, "field": field}


async def _assert_assigned_driver(delivery_id: str, user: User):
    drv = await _db().drivers.find_one({"user_id": user.id, "organization_id": user.organization_id}, {"_id": 0})
    if not drv:
        raise HTTPException(status_code=403, detail="Driver profile required")
    delivery = await _db().deliveries.find_one(
        {"id": delivery_id, **tenant_scope(user)}, {"_id": 0},
    )
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if delivery.get("assigned_driver_id") != drv["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to this delivery")
    return delivery, drv


# ===================== RATINGS =====================

@router.post("/deliveries/{delivery_id}/ratings/customer", response_model=DeliveryRating)
async def rate_as_customer(delivery_id: str, payload: CustomerRatingSubmit,
                           user: User = Depends(get_current_user)):
    delivery = await _db().deliveries.find_one({"id": delivery_id, **tenant_scope(user)}, {"_id": 0})
    if not delivery or delivery.get("status") != DeliveryStatus.DELIVERED.value:
        raise HTTPException(status_code=400, detail="Delivery must be delivered")
    existing = await _db().delivery_ratings.find_one(
        {"delivery_id": delivery_id, "rater_user_id": user.id}, {"_id": 0},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already rated")
    rating = DeliveryRating(
        organization_id=user.organization_id,
        delivery_id=delivery_id,
        rater_user_id=user.id,
        rater_role="customer",
        driver_rating=payload.driver_rating,
        punctuality_rating=payload.punctuality_rating,
        professionalism_rating=payload.professionalism_rating,
        overall_rating=payload.overall_rating,
        comment=payload.comment,
    )
    await _db().delivery_ratings.insert_one(rating.model_dump())
    if delivery.get("assigned_driver_id"):
        await update_driver_rating_aggregates(
            _db(), delivery["assigned_driver_id"],
            payload.punctuality_rating, payload.professionalism_rating, payload.overall_rating,
        )
    await _log_audit()("delivery.rated_by_customer", user, "delivery", delivery_id)
    return rating


@router.post("/deliveries/{delivery_id}/ratings/driver", response_model=DeliveryRating)
async def rate_as_driver(delivery_id: str, payload: DriverRatingSubmit,
                         user: User = Depends(require_roles([Role.DRIVER]))):
    delivery, _ = await _assert_assigned_driver(delivery_id, user)
    if delivery.get("status") != DeliveryStatus.DELIVERED.value:
        raise HTTPException(status_code=400, detail="Delivery must be delivered")
    existing = await _db().delivery_ratings.find_one(
        {"delivery_id": delivery_id, "rater_user_id": user.id}, {"_id": 0},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already rated")
    rating = DeliveryRating(
        organization_id=user.organization_id,
        delivery_id=delivery_id,
        rater_user_id=user.id,
        rater_role="driver",
        customer_interaction_rating=payload.customer_interaction_rating,
        comment=payload.comment,
    )
    await _db().delivery_ratings.insert_one(rating.model_dump())
    await _log_audit()("delivery.rated_by_driver", user, "delivery", delivery_id)
    return rating


# ===================== OPS DASHBOARD EXTENSIONS =====================

@router.get("/dashboard/operations")
async def operations_dashboard(user: User = Depends(require_roles([Role.ORG_OWNER, Role.OPS_MANAGER, Role.DISPATCHER]))):
    scope = tenant_scope(user)
    now = now_iso()
    pending_verifications = await _db().partner_onboarding.count_documents({
        **scope, "verification_status": {"$in": [
            VerificationStatus.PENDING.value, VerificationStatus.DOCS_REVIEW.value,
        ]},
    })
    active_offers = await _db().delivery_offers.count_documents({
        **scope, "status": OfferStatus.PENDING.value, "expires_at": {"$gt": now},
    })
    accepted_offers = await _db().delivery_offers.count_documents({
        **scope, "status": OfferStatus.ACCEPTED.value,
    })
    available_drivers = await _db().drivers.count_documents({
        **scope, "status": "available",
        "verification_status": {"$in": [VerificationStatus.ACTIVE.value, "active"]},
    })
    pipeline = [{"$match": scope}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    deliveries_by_state = []
    async for row in _db().deliveries.aggregate(pipeline):
        deliveries_by_state.append({"status": row["_id"], "count": row["count"]})
    rating_pipeline = [
        {"$match": {**scope, "rating_count": {"$gt": 0}}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"},
                    "avg_punctuality": {"$avg": "$rating_punctuality"}}},
    ]
    driver_ratings = {"avg_rating": 5.0, "avg_punctuality": 5.0}
    async for row in _db().drivers.aggregate(rating_pipeline):
        driver_ratings = {"avg_rating": round(row.get("avg_rating") or 5, 2),
                          "avg_punctuality": round(row.get("avg_punctuality") or 5, 2)}
    verification_stats = []
    vpipe = [{"$match": scope}, {"$group": {"_id": "$verification_status", "count": {"$sum": 1}}}]
    async for row in _db().partner_onboarding.aggregate(vpipe):
        verification_stats.append({"status": row["_id"], "count": row["count"]})
    return {
        "pending_verifications": pending_verifications,
        "active_offers": active_offers,
        "accepted_offers": accepted_offers,
        "available_drivers": available_drivers,
        "deliveries_by_state": deliveries_by_state,
        "driver_ratings": driver_ratings,
        "verification_stats": verification_stats,
    }

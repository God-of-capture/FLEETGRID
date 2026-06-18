"""Phase 2 business logic: offers, notifications, geo, ratings."""
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

from models import (
    DeliveryOffer, DeliveryStatus, Driver, Notification, OfferStatus,
    Role, StatusEvent, User, VerificationStatus,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def estimate_payout(distance_km: float, weight_kg: float = 0, priority: str = "normal") -> float:
    base = 80.0 + distance_km * 12.0 + weight_kg * 2.0
    mult = {"low": 0.9, "normal": 1.0, "high": 1.2, "urgent": 1.5, "express": 1.4, "same_day": 1.6}.get(priority, 1.0)
    return round(base * mult, 2)


def timeline_event(status: DeliveryStatus, note: str, event_type: str,
                   lat: Optional[float] = None, lng: Optional[float] = None) -> dict:
    return StatusEvent(status=status, note=note, event_type=event_type,
                       lat=lat, lng=lng).model_dump()


async def push_notification(db, org_id: str, user_id: Optional[str],
                            title: str, body: str, ntype: str = "info",
                            link: Optional[str] = None) -> None:
    n = Notification(
        organization_id=org_id, user_id=user_id,
        title=title, body=body, type=ntype, link=link,
    )
    await db.notifications.insert_one(n.model_dump())


async def notify_user_email(emailer_module, email: str, subject: str, body: str) -> None:
    """Email abstraction — no-op if Resend not configured."""
    try:
        if hasattr(emailer_module, "send_generic"):
            await emailer_module.send_generic(email, subject, body)
    except Exception:
        pass


async def notify_user_sms(phone: str, message: str) -> None:
    """SMS abstraction placeholder for Twilio integration."""
    pass  # Future: Twilio


async def find_eligible_drivers(db, org_id: str, pickup_lat: float, pickup_lng: float,
                                radius_km: float, max_drivers: int) -> List[dict]:
    cursor = db.drivers.find({
        "organization_id": org_id,
        "status": "available",
        "verification_status": {"$in": [VerificationStatus.ACTIVE.value, VerificationStatus.APPROVED.value, "active"]},
        "current_lat": {"$ne": None},
        "current_lng": {"$ne": None},
    }, {"_id": 0})
    candidates = []
    async for d in cursor:
        dist = haversine_km(pickup_lat, pickup_lng, d["current_lat"], d["current_lng"])
        if dist <= radius_km:
            candidates.append({**d, "distance_km": round(dist, 2)})
    candidates.sort(key=lambda x: x["distance_km"])
    return candidates[:max_drivers]


async def create_offers_for_delivery(db, delivery: dict, org_id: str,
                                     radius_km: float, ttl_minutes: int,
                                     max_drivers: int,
                                     log_audit: Callable,
                                     actor: Optional[User] = None) -> List[DeliveryOffer]:
    if not delivery.get("pickup_lat") or not delivery.get("pickup_lng"):
        return []
    drivers = await find_eligible_drivers(
        db, org_id, delivery["pickup_lat"], delivery["pickup_lng"], radius_km, max_drivers,
    )
    if not drivers:
        return []
    expires = (datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)).isoformat()
    offers = []
    for drv in drivers:
        payout = estimate_payout(drv["distance_km"], delivery.get("weight_kg", 0), delivery.get("priority", "normal"))
        offer = DeliveryOffer(
            organization_id=org_id,
            delivery_id=delivery["id"],
            driver_id=drv["id"],
            estimated_distance_km=drv["distance_km"],
            payout_estimate=payout,
            expires_at=expires,
        )
        await db.delivery_offers.insert_one(offer.model_dump())
        offers.append(offer)
        if drv.get("user_id"):
            await push_notification(
                db, org_id, drv["user_id"],
                "New delivery offer",
                f"Offer for {delivery['tracking_code']} — ₹{payout:.0f}, {drv['distance_km']:.1f} km away",
                "info", "/driver/jobs",
            )
    event = timeline_event(DeliveryStatus.OFFERED, f"Offered to {len(offers)} drivers", "offered")
    await db.deliveries.update_one(
        {"id": delivery["id"]},
        {"$set": {"status": DeliveryStatus.OFFERED.value, "offer_mode": True,
                  "payout_estimate": offers[0].payout_estimate if offers else None},
         "$push": {"timeline": event}},
    )
    if actor:
        await log_audit("delivery.offered", actor, "delivery", delivery["id"],
                        {"offer_count": len(offers)})
    return offers


async def accept_offer_atomic(db, offer_id: str, driver_id: str, org_id: str,
                              user: User, log_audit: Callable) -> dict:
    """Atomic accept-first-wins using conditional updates."""
    now = now_iso()
    offer = await db.delivery_offers.find_one_and_update(
        {"id": offer_id, "driver_id": driver_id, "organization_id": org_id,
         "status": OfferStatus.PENDING.value, "expires_at": {"$gt": now}},
        {"$set": {"status": OfferStatus.ACCEPTED.value, "accepted_at": now}},
    )
    if not offer:
        raise ValueError("Offer unavailable or expired")

    delivery_id = offer["delivery_id"]
    drv = await db.drivers.find_one({"id": driver_id, "organization_id": org_id}, {"_id": 0})
    if not drv:
        raise ValueError("Driver not found")
    if drv.get("verification_status") not in (
        VerificationStatus.ACTIVE.value, VerificationStatus.APPROVED.value, "active",
    ):
        raise ValueError("Driver not approved for deliveries")

    veh_id = drv.get("assigned_vehicle_id")
    accept_event = timeline_event(
        DeliveryStatus.ASSIGNED,
        f"Accepted by {drv['full_name']}", "accepted",
    )
    delivery = await db.deliveries.find_one_and_update(
        {"id": delivery_id, "organization_id": org_id,
         "status": {"$in": [DeliveryStatus.PENDING.value, DeliveryStatus.OFFERED.value]},
         "assigned_driver_id": None},
        {"$set": {
            "assigned_driver_id": driver_id,
            "assigned_vehicle_id": veh_id,
            "status": DeliveryStatus.ASSIGNED.value,
            "payout_estimate": offer.get("payout_estimate"),
        },
         "$push": {"timeline": accept_event}},
    )
    if not delivery:
        await db.delivery_offers.update_one(
            {"id": offer_id}, {"$set": {"status": OfferStatus.EXPIRED.value}},
        )
        raise ValueError("Delivery already assigned")

    await db.delivery_offers.update_many(
        {"delivery_id": delivery_id, "id": {"$ne": offer_id}, "status": OfferStatus.PENDING.value},
        {"$set": {"status": OfferStatus.EXPIRED.value}},
    )
    await db.drivers.update_one({"id": driver_id}, {"$set": {"status": "on_trip"}})
    await log_audit("delivery.offer_accepted", user, "delivery", delivery_id,
                    {"offer_id": offer_id, "driver_id": driver_id})
    await push_notification(
        db, org_id, None,
        "Delivery accepted",
        f"{delivery['tracking_code']} accepted by {drv['full_name']}",
        "success", f"/app/deliveries/{delivery_id}",
    )
    doc = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    return doc


async def expire_stale_offers(db) -> int:
    now = now_iso()
    result = await db.delivery_offers.update_many(
        {"status": OfferStatus.PENDING.value, "expires_at": {"$lte": now}},
        {"$set": {"status": OfferStatus.EXPIRED.value}},
    )
    return result.modified_count


async def update_driver_rating_aggregates(db, driver_id: str, punctuality: float,
                                          professionalism: float, overall: float) -> None:
    drv = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not drv:
        return
    count = drv.get("rating_count", 0) + 1
    def avg(old: float, new: float) -> float:
        return round(((old * (count - 1)) + new) / count, 2)
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {
            "rating": avg(drv.get("rating", 5.0), overall),
            "rating_punctuality": avg(drv.get("rating_punctuality", 5.0), punctuality),
            "rating_professionalism": avg(drv.get("rating_professionalism", 5.0), professionalism),
            "rating_count": count,
        }},
    )

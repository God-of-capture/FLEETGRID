"""Platform admin API — super_admin only, cross-tenant reads with audit."""
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user, require_roles, tenant_scope
from models import Organization, PaginatedResponse, Role, User

router = APIRouter()


def _db():
    from server import db
    return db


def _log_audit():
    from server import log_audit
    return log_audit


def _paginate(items: list, total: int, page: int, page_size: int) -> PaginatedResponse:
    pages = max(1, math.ceil(total / page_size))
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.get("/admin/overview")
async def admin_overview(user: User = Depends(require_roles([Role.SUPER_ADMIN]))):
    await _log_audit()("admin.overview_viewed", user, "platform", None)
    return {
        "organizations": await _db().organizations.count_documents({}),
        "users": await _db().users.count_documents({}),
        "drivers": await _db().drivers.count_documents({}),
        "customers": await _db().customers.count_documents({}),
        "deliveries": await _db().deliveries.count_documents({}),
        "pending_verifications": await _db().partner_onboarding.count_documents({
            "verification_status": {"$in": ["pending", "docs_review"]},
        }),
        "active_subscriptions": await _db().organizations.count_documents({
            "plan": {"$nin": ["trial", None]},
        }),
        "deliveries_today": await _db().deliveries.count_documents({}),
    }


@router.get("/admin/organizations")
async def admin_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_roles([Role.SUPER_ADMIN])),
):
    skip = (page - 1) * page_size
    total = await _db().organizations.count_documents({})
    cursor = _db().organizations.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    items = []
    async for org in cursor:
        user_count = await _db().users.count_documents({"organization_id": org["id"]})
        delivery_count = await _db().deliveries.count_documents({"organization_id": org["id"]})
        items.append({**org, "user_count": user_count, "delivery_count": delivery_count})
    return _paginate(items, total, page, page_size)


@router.get("/admin/users")
async def admin_users(
    role: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_roles([Role.SUPER_ADMIN])),
):
    f = {}
    if role:
        f["roles"] = role
    skip = (page - 1) * page_size
    total = await _db().users.count_documents(f)
    cursor = _db().users.find(f, {"_id": 0, "hashed_password": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    items = [u async for u in cursor]
    return _paginate(items, total, page, page_size)


@router.get("/admin/partners")
async def admin_partners(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_roles([Role.SUPER_ADMIN])),
):
    f = {}
    if status:
        f["verification_status"] = status
    skip = (page - 1) * page_size
    total = await _db().partner_onboarding.count_documents(f)
    cursor = _db().partner_onboarding.find(f, {"_id": 0}).sort("submitted_at", -1).skip(skip).limit(page_size)
    items = [p async for p in cursor]
    return _paginate(items, total, page, page_size)


@router.get("/admin/deliveries")
async def admin_deliveries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_roles([Role.SUPER_ADMIN])),
):
    skip = (page - 1) * page_size
    total = await _db().deliveries.count_documents({})
    cursor = _db().deliveries.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    items = [d async for d in cursor]
    return _paginate(items, total, page, page_size)


@router.get("/admin/subscriptions")
async def admin_subscriptions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_roles([Role.SUPER_ADMIN])),
):
    skip = (page - 1) * page_size
    cols = await _db().list_collection_names()
    total = await _db().billing_orders.count_documents({}) if "billing_orders" in cols else 0
    items = []
    if total:
        cursor = _db().billing_orders.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
        items = [b async for b in cursor]
    orgs = await _db().organizations.find({}, {"_id": 0, "id": 1, "name": 1, "plan": 1, "slug": 1}).to_list(500)
    return {
        "billing_orders": _paginate(items, total, page, page_size),
        "plans_by_org": orgs,
    }


@router.patch("/admin/organizations/{org_id}")
async def admin_update_org(
    org_id: str,
    payload: dict,
    user: User = Depends(require_roles([Role.SUPER_ADMIN])),
):
    allowed = {"is_active", "plan", "name"}
    update = {k: v for k, v in payload.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields")
    res = await _db().organizations.update_one({"id": org_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    await _log_audit()("admin.org_updated", user, "organization", org_id, update)
    doc = await _db().organizations.find_one({"id": org_id}, {"_id": 0})
    return Organization(**doc)

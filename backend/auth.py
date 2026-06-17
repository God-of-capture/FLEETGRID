"""Authentication utilities: password hashing, JWT, current-user dependency."""
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from models import Role, User

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_MIN = int(os.environ.get("ACCESS_TOKEN_MINUTES", "60"))


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, organization_id: Optional[str], roles: List[str]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "organization_id": organization_id,
        "roles": roles,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_MIN)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


# Dependency factory uses db from request app state
async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> User:
    from server import db  # local import to avoid cycle

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token claims")

    doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    user = User(**doc)
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is deactivated")
    return user


def require_roles(allowed: List[Role]):
    allowed_values = {r.value for r in allowed}

    async def _checker(user: User = Depends(get_current_user)) -> User:
        user_role_values = {r.value if isinstance(r, Role) else r for r in user.roles}
        if Role.SUPER_ADMIN.value in user_role_values:
            return user
        if user_role_values.isdisjoint(allowed_values):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return user

    return _checker


def tenant_scope(user: User) -> dict:
    """Build a Mongo filter for tenant isolation. Super admins are unscoped."""
    if any((r.value if isinstance(r, Role) else r) == Role.SUPER_ADMIN.value for r in user.roles):
        return {}
    return {"organization_id": user.organization_id}

from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr

# ---------- Logging (configured early) ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------- Mongo ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App / router ----------
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Auth helpers ----------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_HOURS = 24 * 7  # 7-day admin session
LOCKOUT_THRESHOLD = 5
LOCKOUT_WINDOW_MINUTES = 15

def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

# ---------- Brute force protection ----------
async def check_lockout(identifier: str) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_WINDOW_MINUTES)
    count = await db.login_attempts.count_documents({
        "identifier": identifier,
        "created_at": {"$gte": cutoff.isoformat()},
    })
    if count >= LOCKOUT_THRESHOLD:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts. Try again in {LOCKOUT_WINDOW_MINUTES} minutes.",
        )

async def record_failed_attempt(identifier: str) -> None:
    await db.login_attempts.insert_one({
        "identifier": identifier,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

async def clear_attempts(identifier: str) -> None:
    await db.login_attempts.delete_many({"identifier": identifier})

# ---------- Models ----------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


LeadStatus = Literal["new", "contacted", "booked", "lost"]


class LeadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=5, max_length=40)
    issue: str = Field(..., min_length=1, max_length=2000)
    source: Optional[str] = Field(default="hero_cta")


class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    issue: str
    source: Optional[str] = "hero_cta"
    status: LeadStatus = "new"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=200)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ---------- Public routes ----------
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(payload: StatusCheckCreate):
    obj = StatusCheck(**payload.model_dump())
    doc = obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get("timestamp"), str):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])
    return rows


@api_router.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreate):
    try:
        lead = Lead(**payload.model_dump())
        doc = lead.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.leads.insert_one(doc)
        logger.info(f"New lead captured: {lead.name} - {lead.phone} - source={lead.source}")
        return lead
    except Exception:
        logger.exception("Failed to create lead")
        raise HTTPException(status_code=500, detail="Failed to save lead")


# ---------- Auth routes ----------
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    await check_lockout(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await record_failed_attempt(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await clear_attempts(identifier)
    token = create_access_token(user["id"], user["email"], user.get("role", "admin"))
    return LoginResponse(
        access_token=token,
        user=UserPublic(
            id=user["id"],
            email=user["email"],
            name=user.get("name", "Admin"),
            role=user.get("role", "admin"),
        ),
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(
        id=user["id"],
        email=user["email"],
        name=user.get("name", "Admin"),
        role=user.get("role", "admin"),
    )


@api_router.post("/auth/logout")
async def logout(_user: dict = Depends(get_current_user)):
    # Stateless JWT — client discards the token. Endpoint exists for symmetry.
    return {"ok": True}


# ---------- Admin (protected) ----------
@api_router.get("/leads", response_model=List[Lead])
async def list_leads(_admin: dict = Depends(require_admin)):
    rows = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for r in rows:
        if isinstance(r.get("created_at"), str):
            r["created_at"] = datetime.fromisoformat(r["created_at"])
        r.setdefault("status", "new")
    return rows


@api_router.patch("/leads/{lead_id}/status", response_model=Lead)
async def update_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    _admin: dict = Depends(require_admin),
):
    result = await db.leads.find_one_and_update(
        {"id": lead_id},
        {"$set": {"status": payload.status}},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
    if isinstance(result.get("created_at"), str):
        result["created_at"] = datetime.fromisoformat(result["created_at"])
    result.setdefault("status", "new")
    return result


# ---------- Mount router + middleware ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Startup: indexes + admin seed ----------
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.login_attempts.create_index("identifier")
        await db.leads.create_index("created_at")
    except Exception:
        logger.exception("Failed to create indexes")

    admin_email = os.environ.get("ADMIN_EMAIL", "").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_email or not admin_password:
        logger.warning("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed")
        return

    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info(f"Updated admin password for {admin_email}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

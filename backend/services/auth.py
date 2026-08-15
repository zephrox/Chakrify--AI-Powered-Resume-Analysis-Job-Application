import os
import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import aiosqlite
from config import DATABASE_URL
from dotenv import load_dotenv

load_dotenv(override=True)

# ── Security config ──────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "chakrify-super-secret-dev-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Password helpers ─────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── JWT helpers ───────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

# ── DB helpers ────────────────────────────────────────────────────────────
async def get_user_by_email(email: str) -> Optional[dict]:
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
        row = await cur.fetchone()
        return dict(row) if row else None

async def get_user_by_id(user_id: int) -> Optional[dict]:
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cur.fetchone()
        return dict(row) if row else None

async def create_user(email: str, username: str, password: str) -> dict:
    hashed = hash_password(password)
    async with aiosqlite.connect(DATABASE_URL) as db:
        cur = await db.execute(
            "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
            (email.lower().strip(), username.strip(), hashed)
        )
        await db.commit()
        user_id = cur.lastrowid
        # Create default preferences for this user
        await db.execute("INSERT OR IGNORE INTO preferences (user_id) VALUES (?)", (user_id,))
        await db.commit()
    return await get_user_by_id(user_id)

async def authenticate_user(email: str, password: str) -> Optional[dict]:
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user

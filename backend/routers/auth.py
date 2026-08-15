import re
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator
from services.auth import (
    authenticate_user, create_user, get_user_by_email,
    create_access_token, decode_token, get_user_by_id
)

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

# ── Request schemas ───────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[\w.+-]+@[\w-]+\.[\w.-]+$', v):
            raise ValueError('Invalid email address')
        return v.lower().strip()

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        v = v.strip()
        if len(v) < 2 or len(v) > 50:
            raise ValueError('Username must be 2-50 characters')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class LoginRequest(BaseModel):
    email: str
    password: str

# ── Dependency: get current user from Bearer token ────────────────────────
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")
    user = await get_user_by_id(int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")
    return user

# ── Endpoints ─────────────────────────────────────────────────────────────
@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    """Register a new Chakrify account."""
    existing = await get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = await create_user(body.email, body.username, body.password)
    token = create_access_token({"sub": str(user["id"])})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "username": user["username"]}
    }

@router.post("/login")
async def login(body: LoginRequest):
    """Log in and receive a JWT access token."""
    user = await authenticate_user(body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password."
        )
    token = create_access_token({"sub": str(user["id"])})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "username": user["username"]}
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's info."""
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "username": current_user["username"],
        "created_at": current_user["created_at"]
    }

@router.post("/logout")
async def logout():
    """Client-side logout — just clear the token on the frontend."""
    return {"message": "Logged out successfully. Please clear your token."}

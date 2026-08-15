import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import init_db
from routers import candidates, jobs, matches, cover_letters, preferences, stats, auth, saved_jobs

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

# Rate limiter — keyed by IP address
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="Chakrify API",
    description="Chakrify — AI-powered job matching, skill gap analysis, and cover letter generation",
    version="2.0.0",
    lifespan=lifespan
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Extra production origins from env (comma-separated)
_extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174",
        "http://localhost:3000", "http://127.0.0.1:3000",
        *_extra_origins,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(candidates.router)
app.include_router(jobs.router)
app.include_router(matches.router)
app.include_router(cover_letters.router)
app.include_router(preferences.router)
app.include_router(saved_jobs.router)
app.include_router(stats.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Chakrify API", "version": "2.0.0"}

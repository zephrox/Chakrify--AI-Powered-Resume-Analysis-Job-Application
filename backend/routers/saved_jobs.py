import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from routers.auth import get_current_user
from config import DATABASE_URL

router = APIRouter(prefix="/saved-jobs", tags=["saved_jobs"])

@router.post("/{job_id}")
async def save_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Save a job to the user's saved jobs list."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        # Verify job exists
        cur = await db.execute("SELECT id FROM jobs WHERE id = ?", (job_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Job not found.")
        try:
            await db.execute(
                "INSERT OR IGNORE INTO saved_jobs (user_id, job_id) VALUES (?, ?)",
                (current_user["id"], job_id)
            )
            await db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Job saved successfully.", "job_id": job_id}

@router.delete("/{job_id}")
async def unsave_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a job from saved jobs."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(
            "DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?",
            (current_user["id"], job_id)
        )
        await db.commit()
    return {"message": "Job removed from saved jobs.", "job_id": job_id}

@router.get("/")
async def list_saved_jobs(current_user: dict = Depends(get_current_user)):
    """List all saved jobs for the current user."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("""
            SELECT j.*, sj.saved_at
            FROM saved_jobs sj
            JOIN jobs j ON sj.job_id = j.id
            WHERE sj.user_id = ?
            ORDER BY sj.saved_at DESC
        """, (current_user["id"],))
        rows = await cur.fetchall()
    return {"saved_jobs": [dict(r) for r in rows]}

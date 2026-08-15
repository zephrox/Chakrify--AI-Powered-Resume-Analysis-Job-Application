import json
import aiosqlite
import aiofiles
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from services.cv_parser import parse_cv
from routers.auth import get_current_user
from config import DATABASE_URL, UPLOADS_DIR

router = APIRouter(prefix="/candidates", tags=["candidates"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/upload")
async def upload_cv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a CV/Resume file and parse it into a structured profile."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Please upload a PDF or DOCX file.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    # Save file under user-specific subdirectory
    user_upload_dir = Path(UPLOADS_DIR) / str(current_user["id"])
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    save_path = user_upload_dir / file.filename

    async with aiofiles.open(save_path, 'wb') as f:
        await f.write(content)

    try:
        raw_text, profile = await parse_cv(str(save_path))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CV: {str(e)}")

    async with aiosqlite.connect(DATABASE_URL) as db:
        # Delete old candidate for this user, then insert new
        await db.execute("DELETE FROM candidates WHERE user_id = ?", (current_user["id"],))
        await db.execute(
            "INSERT INTO candidates (user_id, raw_text, profile, resume_path) VALUES (?, ?, ?, ?)",
            (current_user["id"], raw_text, json.dumps(profile), str(save_path))
        )
        await db.commit()
        cur = await db.execute("SELECT id FROM candidates WHERE user_id = ? ORDER BY id DESC LIMIT 1", (current_user["id"],))
        row = await cur.fetchone()
        candidate_id = row[0]

    return {"id": candidate_id, "profile": profile, "message": "CV parsed successfully"}

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's candidate profile."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT id, profile, resume_path, created_at FROM candidates WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (current_user["id"],)
        )
        row = await cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="No profile found. Please upload a CV first.")

    return {
        "id": row["id"],
        "profile": json.loads(row["profile"]),
        "resume_path": row["resume_path"],
        "created_at": row["created_at"]
    }

@router.delete("/profile")
async def delete_profile(current_user: dict = Depends(get_current_user)):
    """Delete the current user's candidate profile."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("DELETE FROM candidates WHERE user_id = ?", (current_user["id"],))
        await db.commit()
    return {"message": "Profile deleted successfully"}

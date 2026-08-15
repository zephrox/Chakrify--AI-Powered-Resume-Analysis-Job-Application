import json
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
import aiosqlite
from config import DATABASE_URL
from services.cover_letter_engine import (
    generate_cover_letter_gemini,
    save_cover_letter,
    get_cover_letters_for_candidate,
    get_cover_letter_by_id,
    update_cover_letter_content,
    delete_cover_letter_from_db
)
from services.match_engine import score_candidate_for_job

router = APIRouter(prefix="/cover_letters", tags=["Cover Letters"])

class GenerateRequest(BaseModel):
    job_id: str
    candidate_id: int
    tone: str = "professional"
    custom_instructions: str = ""

class UpdateRequest(BaseModel):
    content: str
    tone: str = "professional"

@router.post("/generate")
async def generate_cover_letter(req: GenerateRequest):
    """Generate an AI-tailored cover letter for a candidate and job."""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            db.row_factory = aiosqlite.Row
            # Get candidate
            c_cur = await db.execute("SELECT profile, raw_text FROM candidates WHERE id = ?", (req.candidate_id,))
            c_row = await c_cur.fetchone()
            if not c_row:
                raise HTTPException(status_code=404, detail="Candidate not found.")
            profile = json.loads(c_row["profile"])
            if c_row["raw_text"]:
                profile["raw_resume_text"] = c_row["raw_text"]
            
            # Get job
            j_cur = await db.execute("SELECT * FROM jobs WHERE id = ?", (req.job_id,))
            j_row = await j_cur.fetchone()
            if not j_row:
                raise HTTPException(status_code=404, detail="Job not found.")
            job = dict(j_row)

        # Get or calculate match
        try:
            match = await score_candidate_for_job(req.candidate_id, req.job_id)
        except Exception:
            match = {"breakdown": {}}
            
        # Generate cover letter text
        content = await generate_cover_letter_gemini(profile, job, match, req.tone, req.custom_instructions)
        
        # Save to DB
        saved_cl = await save_cover_letter(req.candidate_id, req.job_id, content, req.tone, req.custom_instructions)
        return {"status": "success", "cover_letter": saved_cl}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

@router.get("/candidate/{candidate_id}")
async def get_candidate_cover_letters(candidate_id: int):
    """Retrieve all saved cover letters for a candidate."""
    try:
        letters = await get_cover_letters_for_candidate(candidate_id)
        return {"status": "success", "count": len(letters), "cover_letters": letters}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{cl_id}")
async def update_cover_letter(cl_id: int, req: UpdateRequest):
    """Update cover letter text and tone."""
    try:
        updated = await update_cover_letter_content(cl_id, req.content, req.tone)
        if not updated:
            raise HTTPException(status_code=404, detail="Cover letter not found.")
        return {"status": "success", "cover_letter": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{cl_id}")
async def delete_cover_letter(cl_id: int):
    """Delete a saved cover letter."""
    try:
        success = await delete_cover_letter_from_db(cl_id)
        return {"status": "success", "deleted": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

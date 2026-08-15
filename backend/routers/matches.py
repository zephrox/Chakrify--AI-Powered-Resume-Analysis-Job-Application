import asyncio
from fastapi import APIRouter, HTTPException, Query
from services.match_engine import score_candidate_for_job, get_matches_for_candidate
from services.job_aggregator import get_all_jobs_from_db

router = APIRouter(prefix="/matches", tags=["Matches"])

@router.post("/score/{job_id}")
async def score_job(job_id: str, candidate_id: int = Query(..., description="Candidate ID")):
    """Calculate or retrieve AI match score between a candidate and a job."""
    try:
        match_result = await score_candidate_for_job(candidate_id, job_id)
        return {"status": "success", "match": match_result}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/score_all")
async def score_all_jobs(candidate_id: int = Query(..., description="Candidate ID")):
    """Score all current jobs in the DB against this candidate."""
    try:
        jobs = await get_all_jobs_from_db()
        results = []
        for idx, j in enumerate(jobs):
            try:
                res = await score_candidate_for_job(candidate_id, j["id"])
                results.append(res)
                if idx < len(jobs) - 1:
                    await asyncio.sleep(0.3)
            except Exception as ex:
                print(f"[Error scoring job {j['id']}]: {ex}")
                continue
        results.sort(key=lambda x: x["score"], reverse=True)
        return {"status": "success", "count": len(results), "matches": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candidate/{candidate_id}")
async def get_candidate_matches(candidate_id: int):
    """Get all previously evaluated match results for a candidate."""
    try:
        matches = await get_matches_for_candidate(candidate_id)
        return {"status": "success", "count": len(matches), "matches": matches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

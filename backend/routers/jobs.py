from fastapi import APIRouter, HTTPException, Query
from services.job_aggregator import search_and_save_jobs, get_all_jobs_from_db, get_job_by_id_from_db

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/search")
async def search_jobs(
    query: str = Query("", description="Job role or keywords"),
    location: str = Query("", description="Location or Remote"),
    remote: str = Query("", description="Remote preference"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Number of jobs per page")
):
    """Search for jobs from available engines (SerpAPI/Remotive/Mock) and save to DB."""
    try:
        all_jobs = await search_and_save_jobs(query=query, location=location, remote=remote)
        total_jobs = len(all_jobs)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_jobs = all_jobs[start_idx:end_idx]
        has_more = end_idx < total_jobs
        return {
            "status": "success", 
            "count": len(paginated_jobs), 
            "total_jobs": total_jobs,
            "page": page,
            "limit": limit,
            "has_more": has_more,
            "jobs": paginated_jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Number of jobs per page")
):
    """Get all jobs stored in DB with pagination."""
    try:
        all_jobs = await get_all_jobs_from_db()
        total_jobs = len(all_jobs)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_jobs = all_jobs[start_idx:end_idx]
        has_more = end_idx < total_jobs
        return {
            "status": "success", 
            "count": len(paginated_jobs), 
            "total_jobs": total_jobs,
            "page": page,
            "limit": limit,
            "has_more": has_more,
            "jobs": paginated_jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{job_id}")
async def get_job(job_id: str):
    """Get details for a specific job ID."""
    job = await get_job_by_id_from_db(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": "success", "job": job}

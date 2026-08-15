import aiosqlite
from fastapi import APIRouter, HTTPException

from config import DATABASE_URL

router = APIRouter(
    prefix="/stats",
    tags=["Stats"],
)


@router.get("")
async def get_stats():
    """Aggregate and return summary statistics from the database."""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            async with db.execute("SELECT count(id) FROM jobs") as cursor:
                row = await cursor.fetchone()
                total_jobs = row[0] if row else 0

            async with db.execute("SELECT count(id) FROM matches") as cursor:
                row = await cursor.fetchone()
                total_matches = row[0] if row else 0

            async with db.execute("SELECT COALESCE(AVG(score), 0) FROM matches") as cursor:
                row = await cursor.fetchone()
                avg_match_score = round(row[0]) if row else 0

            async with db.execute("SELECT COALESCE(MAX(score), 0) FROM matches") as cursor:
                row = await cursor.fetchone()
                top_match_score = row[0] if row else 0

            async with db.execute("SELECT count(id) FROM cover_letters") as cursor:
                row = await cursor.fetchone()
                total_cover_letters = row[0] if row else 0

            async with db.execute("SELECT count(id) FROM candidates") as cursor:
                row = await cursor.fetchone()
                has_profile = (row[0] > 0) if row else False

        return {
            "status": "success",
            "stats": {
                "total_jobs": total_jobs,
                "total_matches": total_matches,
                "avg_match_score": avg_match_score,
                "top_match_score": top_match_score,
                "total_cover_letters": total_cover_letters,
                "has_profile": has_profile,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

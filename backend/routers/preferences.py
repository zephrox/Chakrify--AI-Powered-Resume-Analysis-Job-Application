import json
import aiosqlite
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import DATABASE_URL

router = APIRouter(
    prefix="/preferences",
    tags=["Preferences"],
)


class PreferencesUpdate(BaseModel):
    target_roles: list[str] = []
    preferred_location: str = ""
    remote_preference: str = "any"
    min_score_display: int = 50
    blacklisted_companies: list[str] = []
    blacklisted_keywords: list[str] = []
    scoring_weights: dict = {
        "skills": 40,
        "experience": 30,
        "domain": 20,
        "education": 10,
    }


def _parse_row(row: dict) -> dict:
    """Parse JSON string fields from a preferences DB row into Python objects."""
    parsed = dict(row)
    for field in ("target_roles", "blacklisted_companies", "blacklisted_keywords", "scoring_weights"):
        if isinstance(parsed.get(field), str):
            try:
                parsed[field] = json.loads(parsed[field])
            except (json.JSONDecodeError, TypeError):
                parsed[field] = [] if field != "scoring_weights" else {}
    return parsed


@router.get("")
async def get_preferences():
    """Return the single preferences row with all JSON fields parsed."""
    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM preferences LIMIT 1") as cursor:
                row = await cursor.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Preferences not found.")

        return {"status": "success", "preferences": _parse_row(row)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch preferences: {str(e)}")


@router.put("")
async def update_preferences(data: PreferencesUpdate):
    """Validate and persist updated preferences, returning the saved values."""
    # Validate that scoring_weights values sum to 100 (±1 tolerance)
    weight_sum = sum(data.scoring_weights.values())
    if abs(weight_sum - 100) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"scoring_weights values must sum to 100 (got {weight_sum}).",
        )

    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            await db.execute(
                """
                UPDATE preferences SET
                    target_roles = ?,
                    preferred_location = ?,
                    remote_preference = ?,
                    min_score_display = ?,
                    blacklisted_companies = ?,
                    blacklisted_keywords = ?,
                    scoring_weights = ?
                WHERE id = (SELECT id FROM preferences LIMIT 1)
                """,
                (
                    json.dumps(data.target_roles),
                    data.preferred_location,
                    data.remote_preference,
                    data.min_score_display,
                    json.dumps(data.blacklisted_companies),
                    json.dumps(data.blacklisted_keywords),
                    json.dumps(data.scoring_weights),
                ),
            )
            await db.commit()

            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM preferences LIMIT 1") as cursor:
                row = await cursor.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Preferences row not found after update.")

        return {"status": "success", "preferences": _parse_row(row)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

import aiosqlite
import json
from config import DATABASE_URL

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_text    TEXT,
    profile     TEXT NOT NULL,
    resume_path TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    company      TEXT NOT NULL,
    location     TEXT,
    description  TEXT,
    apply_url    TEXT,
    apply_email  TEXT,
    source       TEXT,
    salary_range TEXT,
    posted_date  TEXT,
    fetched_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_jobs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id     TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    saved_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id)
);

CREATE TABLE IF NOT EXISTS matches (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    job_id       TEXT REFERENCES jobs(id),
    score        INTEGER NOT NULL,
    status       TEXT,
    breakdown    TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS cover_letters (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id        INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    job_id              TEXT REFERENCES jobs(id),
    content             TEXT NOT NULL,
    tone                TEXT DEFAULT 'professional',
    custom_instructions TEXT DEFAULT '',
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS preferences (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    target_roles          TEXT DEFAULT '[]',
    preferred_location    TEXT DEFAULT '',
    remote_preference     TEXT DEFAULT 'any',
    min_score_display     INTEGER DEFAULT 50,
    blacklisted_companies TEXT DEFAULT '[]',
    blacklisted_keywords  TEXT DEFAULT '[]',
    scoring_weights       TEXT DEFAULT '{"skills": 40, "experience": 30, "domain": 20, "education": 10}'
);

CREATE INDEX IF NOT EXISTS idx_candidates_user ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_candidate ON matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON cover_letters(user_id);
"""

async def init_db():
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.executescript(CREATE_TABLES_SQL)
        await db.commit()

async def get_db():
    return aiosqlite.connect(DATABASE_URL)

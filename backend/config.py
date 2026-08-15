import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
db_env = os.getenv("DATABASE_URL", "../data/jobapply.db")
if "server=" in db_env or "mysql:" in db_env or "postgres:" in db_env:
    db_env = "../data/jobapply.db"
DATABASE_URL = str((Path(__file__).parent / db_env).resolve())
UPLOADS_DIR = str((Path(__file__).parent / os.getenv("UPLOADS_DIR", "../uploads")).resolve())

# Ensure required directories exist
Path(DATABASE_URL).parent.mkdir(parents=True, exist_ok=True)
Path(UPLOADS_DIR).mkdir(parents=True, exist_ok=True)

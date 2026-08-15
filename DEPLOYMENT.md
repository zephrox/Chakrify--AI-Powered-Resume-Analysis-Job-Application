# JobApply AI — Deployment Guide

## Architecture
| Component | Stack | Deployed To |
|-----------|-------|-------------|
| **Frontend** | React + Vite | **Vercel** (free) |
| **Backend** | FastAPI + Python | **Railway** (free tier) |
| **Database** | SQLite | Lives on Railway server |
| **File Storage** | Local filesystem | Lives on Railway server |

---

## Step 1 — Deploy Backend to Railway

Railway gives you a persistent server (SQLite + uploads work fine).

### 1a. Create a Railway project
1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your `jobapply` repository
3. Set the **Root Directory** to `backend`

### 1b. Set Environment Variables on Railway
In the Railway dashboard → **Variables** tab, add:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-flash-latest` |
| `SERPAPI_KEY` | Your SerpAPI key (optional) |
| `DATABASE_URL` | `./data/jobapply.db` |
| `UPLOADS_DIR` | `./uploads` |
| `CORS_ORIGINS` | Your Vercel URL (e.g. `https://jobapply.vercel.app`) |

### 1c. Add a Procfile (or railway.toml)
Railway auto-detects Python. Create `backend/Procfile`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 1d. Note your Railway URL
After deploy, Railway gives you a URL like:
```
https://jobapply-backend-production.up.railway.app
```
**Copy this — you need it for Step 2.**

---

## Step 2 — Deploy Frontend to Vercel

### 2a. Import the repo to Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. Vercel will detect the `vercel.json` in the root automatically

### 2b. Set Environment Variables on Vercel
In the Vercel dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Railway backend URL (from Step 1d) |

### 2c. Deploy
Click **Deploy**. Vercel builds `frontend/` and serves the static site.

Your app is live at `https://your-project.vercel.app` 🚀

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Frontend auto-connects to `http://localhost:8000` when `VITE_API_URL` is not set.

---

## Security Checklist
- [x] `.env` is in `.gitignore` — API keys never leave your machine
- [x] All secrets set as platform environment variables (Railway + Vercel)
- [x] CORS is locked to your Vercel domain only (not `*`)
- [x] File uploads validated for type and size (max 10MB, PDF/DOCX only)
- [x] SQLite is not exposed to the internet

---

## Adding Adzuna (optional — broader job coverage)

Register free at [developer.adzuna.com](https://developer.adzuna.com/). Then add to Railway env:
```
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

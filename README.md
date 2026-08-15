# Chakrify 🎯

**AI-powered resume analysis, job matching, and personalized cover letter generation.**

Chakrify is a modern web application designed to streamline your job search. By leveraging Gemini AI, Chakrify parses your resume, matches it against job descriptions, scores your fit, and generates highly personalized cover letters to help you land interviews faster.

---

## ✨ Features

- **🔒 Secure Accounts**: JWT-based authentication to securely save your profile and jobs.
- **📄 AI Resume Parsing**: Upload your CV (PDF/DOCX) once, and Gemini extracts all structured skills, experience, and education.
- **🔍 Intelligent Job Scoring**: Compare any job description against your profile to get a 0-100 match score and skill gap analysis.
- **✉️ Cover Letter Generation**: Generate tailored, professional cover letters instantly based on your specific CV and the target job.
- **🔖 Saved Jobs**: Bookmark opportunities and track them in your personalized dashboard.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router, Recharts, Lucide Icons, Vanilla CSS (Custom Design System).
- **Backend**: Python 3.11, FastAPI, SQLite (`aiosqlite`), JWT (`python-jose`), bcrypt.
- **AI Integration**: Google Gemini API (via `google-genai`).

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A Gemini API Key ([Get one here](https://aistudio.google.com/))

### 1. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY and a JWT_SECRET_KEY

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
The API documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend will be available at `http://localhost:5173`.

---

## 📦 Deployment

Chakrify is designed for split deployment:
1. **Frontend**: Deploy to **Vercel** (`npm run build`).
2. **Backend**: Deploy to **Railway** or **Render** (requires persistent disk storage for SQLite, which Vercel does not support).

For detailed deployment instructions, refer to the internal Deployment Guide.

---

## 📄 License
MIT License

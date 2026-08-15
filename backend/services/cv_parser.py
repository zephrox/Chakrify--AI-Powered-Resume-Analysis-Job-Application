import json
import re
import os
from pathlib import Path
from dotenv import load_dotenv
import pypdf
from docx import Document
from google import genai
from services.gemini_limiter import gemini_limiter

# Reload env on every import to pick up changes
load_dotenv(override=True)

def get_client():
    """Get a fresh Gemini client using the API key from environment."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in .env file.")
    return genai.Client(api_key=api_key)

def get_models_to_try() -> list[str]:
    """Return ordered list of models to try."""
    # We hardcode these to valid Google AI Studio identifiers
    return ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash-exp"]

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file."""
    text = ""
    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text.strip()

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file."""
    doc = Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])

def extract_text(file_path: str) -> str:
    """Extract text from PDF or DOCX."""
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in (".docx", ".doc"):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")



async def parse_cv_with_gemini(raw_text: str) -> dict:
    """Use Gemini to parse raw CV text into a structured profile.
    Retries with exponential backoff on quota errors."""
    import asyncio

    client = get_client()
    model = "gemini-3.5-flash"  # Stick to the most stable, fastest available model

    prompt = f"""You are an expert HR data extractor. Parse the following resume/CV text and extract structured information.

Return ONLY a valid JSON object with this exact schema (no markdown, no extra text):
{{
  "full_name": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "summary": "2-3 sentence professional summary",
  "target_roles": ["array of 2-4 job titles this person is suitable for"],
  "total_years_exp": number,
  "skills": {{
    "primary": ["top technical skills, max 10"],
    "secondary": ["additional skills, max 10"]
  }},
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "duration": "e.g. 2022-2025 or Jan 2022 - Present",
      "highlights": ["key achievement 1", "key achievement 2"]
    }}
  ],
  "education": [
    {{
      "degree": "Degree Name",
      "institution": "University/School Name",
      "year": year_as_number_or_null,
      "field": "Field of study"
    }}
  ],
  "certifications": ["list of certifications"],
  "languages": ["list of spoken languages"]
}}

Resume Text:
{raw_text}
"""

    # Truncate to save tokens — 6000 chars covers any resume
    prompt_text = prompt[:8000]

    last_error = None
    max_attempts = 3
    
    for attempt in range(max_attempts):
        try:
            await gemini_limiter.acquire()  # Respect free-tier RPM limit
            response = client.models.generate_content(
                model=model,
                contents=prompt_text
            )
            text = response.text.strip()
            # Clean up potential markdown code blocks (multiline safe)
            text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
            text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
            text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
            text = text.strip()
            return json.loads(text)
        except Exception as e:
            last_error = e
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "503" in err_str or "UNAVAILABLE" in err_str:
                # Quota hit or high demand — wait with exponential backoff
                if attempt < max_attempts - 1:
                    wait_time = 3 ** (attempt + 1)  # 3s, then 9s
                    await asyncio.sleep(wait_time)
                    continue
            
            # If it's a 404 or we ran out of attempts, surface it immediately
            raise ValueError(
                f"Gemini API Error (Attempt {attempt + 1}/{max_attempts}). "
                f"If you see 429/503, the free tier is overloaded. Last error: {err_str}"
            )

    raise ValueError(f"Failed to parse CV after {max_attempts} attempts. Last error: {last_error}")

async def parse_cv(file_path: str) -> tuple[str, dict]:
    """Full pipeline: extract text from file, then parse with Gemini."""
    raw_text = extract_text(file_path)
    if not raw_text or len(raw_text) < 50:
        raise ValueError("Could not extract meaningful text from the file. Please ensure the file is not image-based or empty.")
    # Truncate for Gemini token efficiency (6000 chars ≈ ~1500 tokens, more than enough)
    raw_text_trimmed = raw_text[:6000]
    profile = await parse_cv_with_gemini(raw_text)
    return raw_text, profile

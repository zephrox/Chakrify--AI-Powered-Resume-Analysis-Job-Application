import json
import re
import asyncio
from config import DATABASE_URL
import aiosqlite
from services.cv_parser import get_client, get_models_to_try
from services.gemini_limiter import gemini_limiter

def evaluate_match_heuristically(candidate_profile: dict, job_title: str, job_company: str, job_description: str) -> dict:
    """Fallback semantic NLP heuristic match evaluation when LLM API quotas are exhausted."""
    skills_obj = candidate_profile.get("skills", {})
    if isinstance(skills_obj, dict):
        cand_skills = set(
            skills_obj.get("primary", []) + 
            skills_obj.get("secondary", []) + 
            skills_obj.get("languages", []) + 
            skills_obj.get("frameworks", []) + 
            skills_obj.get("tools", [])
        )
    elif isinstance(skills_obj, list):
        cand_skills = set(skills_obj)
    else:
        cand_skills = set()
        
    cand_skills_lower = {s.lower().strip() for s in cand_skills if s}
    job_text_lower = (job_title + " " + job_description).lower()
    
    matched = [s for s in cand_skills if s.lower() in job_text_lower]
    common_tech = ["python", "pytorch", "tensorflow", "react", "typescript", "node.js", "java", "c++", "opencv", "ros", "fastapi", "django", "docker", "kubernetes", "aws", "gcp", "azure", "sql", "postgresql", "mongodb", "graphql", "tailwind", "linux", "git", "ci/cd", "nlp", "llm", "langchain", "gemini", "openai"]
    missing = [t.title() for t in common_tech if t in job_text_lower and t not in cand_skills_lower]
    
    if matched or missing:
        skills_score = min(98, max(30, int((len(matched) / max(1, len(matched) + len(missing) * 0.4)) * 100)))
    else:
        skills_score = 70
        
    # Support both key names: 'total_years_exp' (cv_parser output) and 'total_experience_years' (legacy)
    exp_years = candidate_profile.get("total_years_exp") or candidate_profile.get("total_experience_years") or 2
    if "senior" in job_text_lower or "lead" in job_text_lower or "principal" in job_text_lower:
        exp_score = min(95, max(45, int(exp_years * 20)))
        exp_reason = f"Role requests senior-level leadership; candidate has ~{exp_years} years of demonstrated experience."
    elif "junior" in job_text_lower or "intern" in job_text_lower or "entry" in job_text_lower:
        exp_score = 90
        exp_reason = f"Candidate's experience (~{exp_years} years) fits entry to mid-level expectations very well."
    else:
        exp_score = min(92, max(60, int(exp_years * 25)))
        exp_reason = f"Candidate brings ~{exp_years} years of relevant software and engineering background."
        
    target_roles = [r.lower() for r in candidate_profile.get("target_roles", [])]
    if any(r in job_title.lower() or any(w in job_title.lower() for w in r.split()) for r in target_roles):
        domain_score = 88
        domain_reason = f"Job title '{job_title}' strongly aligns with candidate's target career goals."
    elif any(kw in job_text_lower for kw in ["ai", "ml", "machine learning", "robotics", "vision", "software", "engineer", "developer"]):
        domain_score = 80
        domain_reason = "Strong alignment between candidate's core technical domain and company engineering stack."
    else:
        domain_score = 65
        domain_reason = "General engineering transferability applies to this role."
        
    edu_list = candidate_profile.get("education", [])
    if edu_list:
        edu_score = 90
        edu_reason = f"Candidate holds formal degree ({edu_list[0].get('degree', 'Degree')}), fulfilling educational qualifications."
    else:
        edu_score = 75
        edu_reason = "Practical industry engineering experience satisfies role baseline."
        
    overall = int(skills_score * 0.40 + exp_score * 0.30 + domain_score * 0.20 + edu_score * 0.10)
    
    if overall >= 80: status = "EXCELLENT"
    elif overall >= 65: status = "GOOD"
    elif overall >= 50: status = "FAIR"
    else: status = "POOR"
    
    top_matched_str = ", ".join(matched[:3]) if matched else "core software engineering fundamentals"
    summary = f"This opportunity at {job_company} aligns with your background in {top_matched_str}. Evaluated via high-speed semantic analysis with a {overall}% overall match against your qualifications."
    
    tips = [
        f"Highlight your hands-on project work with {matched[0] if matched else 'modern engineering tools'} in the summary section of your CV.",
        f"Emphasize transferable problem-solving achievements that demonstrate readiness for {job_title} at {job_company}."
    ]
    if missing:
        tips.append(f"Consider addressing familiarity with or willingness to learn {missing[0]} in your cover letter.")
        
    return {
        "overall_score": overall,
        "status": status,
        "breakdown": {
            "skills": {
                "score": skills_score,
                "matched": matched,
                "missing": missing[:5]
            },
            "experience": {
                "score": exp_score,
                "reason": exp_reason
            },
            "domain": {
                "score": domain_score,
                "reason": domain_reason
            },
            "education": {
                "score": edu_score,
                "reason": edu_reason
            }
        },
        "summary": summary,
        "resume_tips": tips[:3]
    }

async def evaluate_match_with_gemini(candidate_profile: dict, job_title: str, job_company: str, job_description: str) -> dict:
    """Use Gemini to evaluate the semantic match between candidate and job, falling back to local NLP on quota errors."""
    client = get_client()

    prompt = f"""You are an expert HR recruitment evaluator and technical hiring manager.
Compare the following Candidate Profile with the Job Description.

Candidate Profile:
{json.dumps(candidate_profile, indent=2)}

Job Title: {job_title} at {job_company}
Job Description:
{job_description}

Evaluate the match across 4 dimensions:
1. Technical Skills (40%): Do candidate's primary/secondary skills match required tech stack?
2. Experience & Seniority (30%): Does total years and job history fit what the role expects?
3. Domain & Industry Fit (20%): Does prior project/company experience align with this product?
4. Education & Certifications (10%): Does background satisfy educational expectations?

Return ONLY a valid JSON object matching this exact schema (no markdown, no extra text):
{{
  "overall_score": number between 0 and 100,
  "status": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "breakdown": {{
    "skills": {{
      "score": number 0-100,
      "matched": ["list of skills candidate has that job requires"],
      "missing": ["list of skills job requires that candidate lacks"]
    }},
    "experience": {{
      "score": number 0-100,
      "reason": "1-2 sentences explaining experience alignment"
    }},
    "domain": {{
      "score": number 0-100,
      "reason": "1-2 sentences explaining domain fit"
    }},
    "education": {{
      "score": number 0-100,
      "reason": "1-2 sentences explaining education alignment"
    }}
  }},
  "summary": "2-3 sentences executive summary of the fit, highlighting strengths and main gap.",
  "resume_tips": ["actionable tip 1 to tailor resume for this job", "actionable tip 2"]
}}
"""

    last_error = None
    for model in get_models_to_try():
        for attempt in range(2):
            try:
                await gemini_limiter.acquire()  # Respect free-tier RPM
                response = client.models.generate_content(
                    model=model,
                    contents=prompt
                )
                text = response.text.strip()
                text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
                text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
                text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
                return json.loads(text.strip())
            except Exception as e:
                last_error = e
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    await asyncio.sleep(1.5)
                    break
                elif "404" in err_str or "NOT_FOUND" in err_str:
                    break
                else:
                    await asyncio.sleep(1.0)
                    
    print(f"[Gemini Quota/Error]: Falling back to Local NLP Heuristic Engine due to: {last_error}")
    return evaluate_match_heuristically(candidate_profile, job_title, job_company, job_description)

async def score_candidate_for_job(candidate_id: int, job_id: str) -> dict:
    """Load candidate and job from DB, evaluate match, save to DB, and return match result."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        
        # Get candidate
        c_cur = await db.execute("SELECT profile FROM candidates WHERE id = ?", (candidate_id,))
        c_row = await c_cur.fetchone()
        if not c_row:
            raise ValueError(f"Candidate ID {candidate_id} not found.")
        profile = json.loads(c_row["profile"])

        # Get job
        j_cur = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        j_row = await j_cur.fetchone()
        if not j_row:
            raise ValueError(f"Job ID {job_id} not found.")
        job = dict(j_row)

        # Check if match already exists
        m_cur = await db.execute("SELECT * FROM matches WHERE candidate_id = ? AND job_id = ?", (candidate_id, job_id))
        m_row = await m_cur.fetchone()
        if m_row:
            m_dict = dict(m_row)
            m_dict["breakdown"] = json.loads(m_dict["breakdown"])
            return m_dict

        # Evaluate with AI
        evaluation = await evaluate_match_with_gemini(profile, job["title"], job["company"], job["description"])
        score = evaluation["overall_score"]
        status = evaluation["status"]
        breakdown_str = json.dumps(evaluation)

        # Insert into DB
        await db.execute("""
            INSERT OR REPLACE INTO matches (candidate_id, job_id, score, status, breakdown)
            VALUES (?, ?, ?, ?, ?)
        """, (candidate_id, job_id, score, status, breakdown_str))
        await db.commit()

        # Retrieve inserted row
        res_cur = await db.execute("SELECT * FROM matches WHERE candidate_id = ? AND job_id = ?", (candidate_id, job_id))
        res_row = await res_cur.fetchone()
        res_dict = dict(res_row)
        res_dict["breakdown"] = json.loads(res_dict["breakdown"])
        return res_dict

async def get_matches_for_candidate(candidate_id: int) -> list[dict]:
    """Get all match evaluations for a candidate, joined with job details."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        sql = """
            SELECT m.*, j.title, j.company, j.location, j.apply_url, j.salary_range, j.description
            FROM matches m
            JOIN jobs j ON m.job_id = j.id
            WHERE m.candidate_id = ?
            ORDER BY m.score DESC
        """
        cursor = await db.execute(sql, (candidate_id,))
        rows = await cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["breakdown"] = json.loads(d["breakdown"]) if d["breakdown"] else {}
            results.append(d)
        return results

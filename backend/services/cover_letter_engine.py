import json
import re
import asyncio
from datetime import datetime
from config import DATABASE_URL
import aiosqlite
from services.cv_parser import get_client, get_models_to_try

def generate_cover_letter_heuristically(candidate_profile: dict, job: dict, match: dict, tone: str, custom_instructions: str) -> str:
    """Fallback high-quality template-based cover letter generator when LLM API quotas are exhausted. Deeply scans CV info."""
    name = candidate_profile.get("full_name") or candidate_profile.get("name") or "Software Engineer"
    email = candidate_profile.get("email") or "email@example.com"
    phone = candidate_profile.get("phone") or ""
    exp_years = candidate_profile.get("total_years_exp") or candidate_profile.get("total_experience_years") or 2
    summary = candidate_profile.get("summary") or ""
    
    skills_obj = candidate_profile.get("skills", {})
    if isinstance(skills_obj, dict):
        primary_skills = skills_obj.get("primary", []) + skills_obj.get("secondary", []) + skills_obj.get("languages", []) + skills_obj.get("frameworks", [])
    elif isinstance(skills_obj, list):
        primary_skills = skills_obj
    else:
        primary_skills = ["Python", "JavaScript", "Software Engineering", "Problem Solving"]
        
    top_skills_str = ", ".join(primary_skills[:5]) if primary_skills else "modern software engineering tools"
    
    breakdown = match.get("breakdown", {})
    matched_skills = breakdown.get("skills", {}).get("matched", [])
    matched_str = ", ".join(matched_skills[:4]) if matched_skills else top_skills_str
    
    company = job.get("company", "Hiring Team")
    title = job.get("title", "Engineering Role")
    location = job.get("location", "Remote")
    
    date_str = datetime.now().strftime("%B %d, %Y")
    
    # Customize opening & closing based on tone
    if tone.lower() == "enthusiastic":
        salutation = f"Dear {company} Engineering Team,"
        opening = f"I am thrilled to submit my application for the {title} position at {company}! As a passionate engineer with ~{exp_years} years of experience building high-performance solutions, I have been following {company}'s work in {location} with immense excitement."
        closing = f"I would be absolutely delighted to bring my energy, technical curiosity, and dedication to your team. Thank you so much for considering my application for the {title} role at {company}—I look forward to discussing how we can build great things together!"
    elif tone.lower() == "technical":
        salutation = f"To the Engineering Leadership at {company},"
        opening = f"I am writing to express my strong interest in the {title} role at {company}. With {exp_years}+ years of hands-on technical architecture experience and deep specialization in {top_skills_str}, I am confident in my ability to hit the ground running and contribute immediately to your core engineering metrics."
        closing = f"I welcome the opportunity to discuss your current technical architecture and demonstrate how my background in scalable systems alignment will accelerate your engineering roadmap for the {title} role at {company}. Thank you for your review."
    elif tone.lower() == "executive":
        salutation = f"Dear {company} Executive Search Team,"
        opening = f"As an experienced technology contributor with ~{exp_years} years of demonstrated success driving engineering excellence and strategic execution, I am writing to apply for the {title} opportunity at {company}."
        closing = f"I look forward to the possibility of an executive alignment conversation to explore how my technical leadership and background can support {company}'s long-term objectives for the {title} position. Respectfully submitted."
    else: # professional default
        salutation = f"Dear {company} Hiring Team,"
        opening = f"I am writing to express my formal interest in the {title} position at {company}. With approximately {exp_years} years of professional software engineering background and a strong technical toolkit centering around {top_skills_str}, I am eager to contribute to your team's ongoing initiatives."
        closing = f"I would welcome the opportunity to speak with you further about how my skills and background align with the needs of the {title} role at {company}. Thank you for your time and consideration."

    # Deep CV Scanning: Extract actual past job experiences & highlights
    experiences = candidate_profile.get("experience", [])
    exp_paragraphs = []
    if isinstance(experiences, list) and experiences:
        for exp in experiences[:2]:
            role_title = exp.get("title", "Software Engineer")
            comp_name = exp.get("company", "my previous organization")
            dur = exp.get("duration", "recent years")
            highlights = exp.get("highlights", [])
            if highlights:
                hl_text = "\n".join([f"  • {hl}" for hl in highlights[:2]])
                exp_paragraphs.append(f"During my tenure as **{role_title}** at **{comp_name}** ({dur}), I drove critical technical initiatives and delivered measurable impact:\n{hl_text}")
            else:
                exp_paragraphs.append(f"In my role as **{role_title}** at **{comp_name}** ({dur}), I architected scalable solutions and collaborated closely with cross-functional stakeholders to meet critical business objectives.")
    
    if exp_paragraphs:
        experience_section = "\n\n".join(exp_paragraphs)
    else:
        experience_section = f"Throughout my career, I have focused heavily on mastering {matched_str}. When reviewing your requirements for the {title} role, I was immediately drawn to the technical challenge and opportunity for impact. My demonstrated ability to deliver clean, maintainable code and architect scalable solutions positions me well to support your ongoing projects in {location}."
    
    # Domain adaptation based on job title & description
    job_text_lower = f"{title} {job.get('description', '')}".lower()
    if any(w in job_text_lower for w in ["ai", "ml", "robotics", "machine learning", "deep learning", "cv", "computer vision", "nlp", "pytorch", "tensorflow", "llm"]):
        domain_focus = f"What particularly excites me about this opportunity at {company} is the intersection of advanced AI/ML research and robust engineering execution. Whether training and deploying models with PyTorch/TensorFlow, optimizing computer vision algorithms, or building scalable AI pipelines, I pride myself on rigorous methodology and rapid innovation."
    elif any(w in job_text_lower for w in ["frontend", "react", "vue", "angular", "ui", "ux", "web"]):
        domain_focus = f"What particularly excites me about this opportunity at {company} is the focus on delivering exceptional user experiences and responsive frontend architectures. I pride myself on crafting clean, intuitive interfaces and optimizing web performance for scale."
    elif any(w in job_text_lower for w in ["data", "etl", "pipeline", "sql", "warehouse", "analytics", "big data"]):
        domain_focus = f"What particularly excites me about this opportunity at {company} is the challenge of designing resilient data architectures and high-throughput pipelines. I thrive when transforming raw data into actionable insights and reliable backend systems."
    else:
        domain_focus = f"What particularly excites me about this role at {company} is the intersection of rigorous engineering standards and scalable system design. Whether architecting backend services, optimizing core databases, or integrating cloud APIs, I pride myself on rapid adaptation and collaborative execution."
    
    custom_section = f"\n\n**Additional Notes on Qualification:**\n{custom_instructions}\n" if custom_instructions.strip() else ""
    
    letter = f"""**{name}**
*{email}* | *{phone}*
*{date_str}*

**{company}**
*{location}*

---

{salutation}

{opening}

{experience_section}

{domain_focus}{custom_section}
{closing}

Sincerely,

**{name}**
*(Tailored via Deep CV Semantic Scanning Engine)*
"""
    return letter.strip()

async def generate_cover_letter_gemini(candidate_profile: dict, job: dict, match: dict, tone: str, custom_instructions: str) -> str:
    """Use Gemini to craft a compelling, tailored cover letter, falling back to local template on quota errors."""
    client = get_client()
    
    name = candidate_profile.get("full_name") or candidate_profile.get("name") or "Software Engineer"
    email = candidate_profile.get("email") or ""
    phone = candidate_profile.get("phone") or ""
    exp_years = candidate_profile.get("total_years_exp") or candidate_profile.get("total_experience_years", "N/A")
    
    breakdown = match.get("breakdown", {})
    matched_skills = breakdown.get("skills", {}).get("matched", [])
    missing_skills = breakdown.get("skills", {}).get("missing", [])
    
    prompt = f"""You are an expert executive career coach and elite technical writer.
Write a compelling, highly personalized, human-sounding cover letter in Markdown format for the following candidate applying to the specified job opportunity.

Candidate Contact Info:
- Full Name: {name}
- Email: {email} | Phone: {phone}

Candidate Structured Profile:
- Total Years Experience: {exp_years}
- Professional Summary: {candidate_profile.get("summary", "N/A")}
- Work Experience History: {json.dumps(candidate_profile.get("experience", []), indent=2)}
- Education History: {json.dumps(candidate_profile.get("education", []), indent=2)}
- Skills: {json.dumps(candidate_profile.get("skills", {}), indent=2)}
- Certifications: {json.dumps(candidate_profile.get("certifications", []), indent=2)}

Candidate Raw Resume/CV Text (for deep context & specific achievements):
{candidate_profile.get("raw_resume_text", "Not provided")}

Target Job Opportunity:
- Job Title: {job.get("title")}
- Company: {job.get("company")}
- Location: {job.get("location")}
- Job Description:
{job.get("description")}

AI Match Evaluation Context:
- Matched Skills: {matched_skills}
- Missing / Growth Skills: {missing_skills}

Tone Requirement: {tone.upper()} (e.g. if Enthusiastic, be high energy and passionate; if Technical, focus on architecture and metrics; if Executive, focus on leadership and strategy; if Professional, remain balanced and polished).

Custom User Instructions / Focus Points:
{custom_instructions if custom_instructions.strip() else "None specified. Highlight top strengths automatically."}

Crucial Writing Guidelines:
1. Deep Personalization (MANDATORY): You MUST scan and extract real past company names, job titles, project highlights, or metrics from the Candidate's Work Experience History or Raw Resume Text and cite them directly in the body paragraphs. NEVER write a generic cover letter that could apply to anyone!
2. No Placeholders: Do NOT use bracketed placeholders like [Date], [Hiring Manager], or [Address]. Use actual details and today's date ({datetime.now().strftime("%B %d, %Y")}). Use "Dear {job.get('company')} Hiring Team," if specific manager name is unknown.
3. Domain Alignment: Align the candidate's past achievements specifically with {job.get("title")} at {job.get("company")}. For example, if applying for an AI/Robotics role, emphasize their Python, PyTorch, Computer Vision, or ML projects over generic web dev tasks.
4. If there are missing skills, do not apologize or sound defensive; instead, emphasize the candidate's demonstrated ability to master complex tech stacks rapidly.
5. Incorporate any Custom User Instructions seamlessly into the narrative.
6. Return ONLY the clean Markdown text of the cover letter (no introductory chat, no markdown code blocks wrapping the entire response, just the raw markdown letter).
"""

    last_error = None
    for model in get_models_to_try():
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt
                )
                text = response.text.strip()
                text = re.sub(r'^```markdown\s*', '', text, flags=re.MULTILINE)
                text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
                text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
                return text.strip()
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
                    
    print(f"[Gemini Quota/Error in Cover Letter]: Falling back to Heuristic Template Engine due to: {last_error}")
    return generate_cover_letter_heuristically(candidate_profile, job, match, tone, custom_instructions)

async def save_cover_letter(candidate_id: int, job_id: str, content: str, tone: str, custom_instructions: str = "") -> dict:
    """Save generated cover letter to database."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            INSERT INTO cover_letters (candidate_id, job_id, content, tone, custom_instructions)
            VALUES (?, ?, ?, ?, ?)
        """, (candidate_id, job_id, content, tone, custom_instructions))
        await db.commit()
        cl_id = cursor.lastrowid
        
        res_cur = await db.execute("SELECT * FROM cover_letters WHERE id = ?", (cl_id,))
        row = await res_cur.fetchone()
        return dict(row)

async def get_cover_letters_for_candidate(candidate_id: int) -> list[dict]:
    """Retrieve all cover letters for a candidate, joined with job details."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        sql = """
            SELECT cl.*, j.title as job_title, j.company as job_company, j.location as job_location, j.apply_url as job_apply_url
            FROM cover_letters cl
            JOIN jobs j ON cl.job_id = j.id
            WHERE cl.candidate_id = ?
            ORDER BY cl.created_at DESC
        """
        cursor = await db.execute(sql, (candidate_id,))
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

async def get_cover_letter_by_id(cl_id: int) -> dict | None:
    """Retrieve a single cover letter by ID."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT cl.*, j.title as job_title, j.company as job_company, j.location as job_location, j.apply_url as job_apply_url
            FROM cover_letters cl
            JOIN jobs j ON cl.job_id = j.id
            WHERE cl.id = ?
        """, (cl_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None

async def update_cover_letter_content(cl_id: int, content: str, tone: str) -> dict:
    """Update cover letter text and tone."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("""
            UPDATE cover_letters
            SET content = ?, tone = ?
            WHERE id = ?
        """, (content, tone, cl_id))
        await db.commit()
        return await get_cover_letter_by_id(cl_id)

async def delete_cover_letter_from_db(cl_id: int) -> bool:
    """Delete a cover letter from DB."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("DELETE FROM cover_letters WHERE id = ?", (cl_id,))
        await db.commit()
        return True

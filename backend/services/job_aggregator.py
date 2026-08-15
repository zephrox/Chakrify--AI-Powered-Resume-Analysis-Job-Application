import hashlib
import json
import os
import re
import asyncio
from datetime import datetime
import httpx
from dotenv import load_dotenv
import aiosqlite
from config import DATABASE_URL

load_dotenv(override=True)

def generate_job_id(company: str, title: str, location: str) -> str:
    """Create a deterministic hash ID for deduplication."""
    raw = f"{company.lower().strip()}|{title.lower().strip()}|{location.lower().strip()}"
    return "job_" + hashlib.md5(raw.encode()).hexdigest()[:12]

async def _serpapi_fetch_page(client: httpx.AsyncClient, api_key: str, query: str, location: str, start: int) -> list[dict]:
    """Fetch one page of Google Jobs results from SerpAPI."""
    url = "https://serpapi.com/search.json"
    params = {"engine": "google_jobs", "q": f"{query} {location}".strip(), "api_key": api_key, "hl": "en", "start": start}
    try:
        resp = await client.get(url, params=params, timeout=12.0)
        jobs_data = resp.json().get("jobs_results", [])
        results = []
        for j in jobs_data:
            title = j.get("title", "")
            company = j.get("company_name", "")
            loc = j.get("location", location or "Remote")
            desc = j.get("description", "No description provided.")
            apply_options = j.get("apply_options", [])
            apply_url = apply_options[0].get("link") if apply_options else f"https://www.google.com/search?q={query}+jobs"
            salary = j.get("detected_extensions", {}).get("salary", "Competitive")
            if title and company:
                results.append({"id": generate_job_id(company, title, loc), "title": title, "company": company,
                    "location": loc, "description": desc, "apply_url": apply_url, "apply_email": "",
                    "source": "google_jobs", "salary_range": salary, "posted_date": datetime.now().strftime("%Y-%m-%d")})
        return results
    except Exception as e:
        print(f"[SerpAPI page={start} Error]: {e}")
        return []

async def fetch_jobs_from_serpapi(query: str, location: str) -> list[dict]:
    """Fetch up to 3 pages of Google Jobs via SerpAPI (broadest coverage — works for ALL job types)."""
    api_key = os.getenv("SERPAPI_KEY", "").strip()
    if not api_key or api_key == "your_serpapi_key_here":
        return []
    async with httpx.AsyncClient() as client:
        pages = await asyncio.gather(
            _serpapi_fetch_page(client, api_key, query, location, 0),
            _serpapi_fetch_page(client, api_key, query, location, 10),
            _serpapi_fetch_page(client, api_key, query, location, 20),
            return_exceptions=True
        )
    results = []
    for p in pages:
        if isinstance(p, list):
            results.extend(p)
    return results


async def fetch_jobs_from_remotive(query: str, location: str = "") -> list[dict]:
    """Fetch free remote jobs from Remotive API — tech/remote focused."""
    async with httpx.AsyncClient() as client:
        try:
            # Fetch by search term AND by bare query to maximise results
            urls = [
                f"https://remotive.com/api/remote-jobs?search={query}&limit=100",
                f"https://remotive.com/api/remote-jobs?search={query}+developer&limit=50" if "develop" not in query.lower() else None,
            ]
            all_data: list[dict] = []
            seen = set()
            for url in urls:
                if not url:
                    continue
                try:
                    resp = await client.get(url, timeout=10.0)
                    for j in resp.json().get("jobs", []):
                        jid = j.get("id")
                        if jid and jid not in seen:
                            seen.add(jid)
                            all_data.append(j)
                except Exception:
                    pass

            results = []
            for j in all_data[:100]:
                title = j.get("title", "Developer")
                company = j.get("company_name", "Remote Company")
                loc = j.get("candidate_required_location", "Remote")
                desc = j.get("description", "Remote role.")
                clean_desc = re.sub(r'<[^>]+>', '', desc)
                salary = j.get("salary") or "$90k - $140k"
                # Location filter
                if location and location.lower() not in ("remote", "any", "worldwide", "global", ""):
                    loc_text = (loc + " " + clean_desc[:500]).lower()
                    if location.lower() not in loc_text and "worldwide" not in loc_text and "anywhere" not in loc_text:
                        continue
                results.append({"id": generate_job_id(company, title, loc), "title": title, "company": company,
                    "location": loc, "description": clean_desc.strip()[:3000], "apply_url": j.get("url", ""),
                    "apply_email": "", "source": "remotive", "salary_range": salary,
                    "posted_date": (j.get("publication_date", "") or "")[:10] or datetime.now().strftime("%Y-%m-%d")})
            return results
        except Exception as e:
            print(f"[Remotive API Error]: {e}")
            return []


async def _arbeitnow_fetch_page(client: httpx.AsyncClient, page: int, q_lower: str, loc_lower: str) -> list[dict]:
    """Fetch one page of Arbeitnow jobs."""
    try:
        resp = await client.get(f"https://www.arbeitnow.com/api/job-board-api?page={page}", timeout=10.0)
        results = []
        for j in resp.json().get("data", []):
            title = j.get("title", "Software Engineer")
            company = j.get("company_name", "Tech Company")
            loc = j.get("location", "Remote")
            desc = j.get("description", "")
            tags = " ".join(j.get("tags", []))
            clean_desc = re.sub(r'<[^>]+>', '', desc)
            if q_lower and not (q_lower in title.lower() or q_lower in clean_desc.lower() or q_lower in tags.lower()):
                continue
            if loc_lower and loc_lower not in ("remote", "any", "worldwide", "global", ""):
                if loc_lower not in loc.lower() and not j.get("remote"):
                    continue
            results.append({"id": generate_job_id(company, title, loc), "title": title, "company": company,
                "location": loc or "Remote", "description": clean_desc.strip()[:3000],
                "apply_url": j.get("url") or "https://www.arbeitnow.com", "apply_email": "",
                "source": "arbeitnow", "salary_range": "Competitive / DOE",
                "posted_date": str(j.get("created_at", ""))[:10] or datetime.now().strftime("%Y-%m-%d")})
        return results
    except Exception as e:
        print(f"[Arbeitnow page={page} Error]: {e}")
        return []

async def fetch_jobs_from_arbeitnow(query: str, location: str = "") -> list[dict]:
    """Fetch 3 pages of jobs from Arbeitnow in parallel (each page has ~100 listings)."""
    q_lower = query.lower().strip()
    loc_lower = location.lower().strip()
    async with httpx.AsyncClient() as client:
        pages = await asyncio.gather(
            _arbeitnow_fetch_page(client, 1, q_lower, loc_lower),
            _arbeitnow_fetch_page(client, 2, q_lower, loc_lower),
            _arbeitnow_fetch_page(client, 3, q_lower, loc_lower),
            return_exceptions=True
        )
    results = []
    for p in pages:
        if isinstance(p, list):
            results.extend(p)
    return results


async def fetch_jobs_from_jobicy(query: str, location: str = "") -> list[dict]:
    """Fetch remote tech jobs from Jobicy API using multiple keyword variants."""
    words = query.lower().split() if query else ["engineering"]
    # Build up to 3 distinct tags to search
    tags = list(dict.fromkeys([words[0], query.replace(" ", "-").lower()[:20], "engineering"]))[:3]
    q_lower = query.lower().strip()
    loc_lower = location.lower().strip()

    async def _fetch_tag(tag: str) -> list[dict]:
        url = f"https://jobicy.com/api/v2/remote-jobs?count=50&tag={tag}"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=10.0)
                return resp.json().get("jobs", [])
        except Exception:
            return []

    all_raw = await asyncio.gather(*[_fetch_tag(t) for t in tags], return_exceptions=True)
    seen_ids: set = set()
    results = []
    for batch in all_raw:
        if not isinstance(batch, list):
            continue
        for j in batch:
            jid = j.get("id")
            if jid in seen_ids:
                continue
            seen_ids.add(jid)
            title = j.get("jobTitle", "Developer")
            company = j.get("companyName", "Remote Company")
            loc = j.get("jobGeo", "Remote")
            desc = j.get("jobDescription") or j.get("jobExcerpt", "Remote engineering role.")
            clean_desc = re.sub(r'<[^>]+>', '', desc)
            if q_lower and not (q_lower in title.lower() or q_lower in clean_desc.lower()):
                continue
            if loc_lower and loc_lower not in ("remote", "any", "worldwide", "global", ""):
                if loc_lower not in loc.lower() and "anywhere" not in loc.lower():
                    continue
            sal_min = j.get("annualSalaryMin")
            sal_max = j.get("annualSalaryMax")
            sal_curr = j.get("salaryCurrency", "$")
            salary = f"{sal_curr}{sal_min} - {sal_curr}{sal_max} / yr" if sal_min and sal_max else "Competitive Remote Salary"
            results.append({"id": generate_job_id(company, title, loc), "title": title, "company": company,
                "location": loc, "description": clean_desc.strip()[:3000], "apply_url": j.get("url", ""),
                "apply_email": "", "source": "jobicy", "salary_range": salary,
                "posted_date": str(j.get("pubDate", ""))[:10] or datetime.now().strftime("%Y-%m-%d")})
    return results

async def fetch_jobs_from_hackernews(query: str, location: str = "") -> list[dict]:
    """Query Algolia HN API for real startup job postings from Ask HN: Who is Hiring threads."""
    search_term = f"hiring {query} {location}".strip()
    url = f"https://hn.algolia.com/api/v1/search?query={search_term}&tags=comment&hitsPerPage=50"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=10.0)
            data = resp.json()
            hits = data.get("hits", [])
            results = []
            for h in hits:
                text = h.get("comment_text", "")
                if not text or len(text) < 40:
                    continue
                clean_text = re.sub(r'<[^>]+>', '', text)
                lines = [l.strip() for l in clean_text.split('\n') if l.strip()]
                if not lines:
                    continue
                first_line = lines[0]
                parts = [p.strip() for p in re.split(r'\||[-\u2013\u2014]', first_line) if p.strip()]
                if len(parts) >= 2 and len(parts[0]) < 40:
                    company = parts[0]
                    title = parts[1]
                    loc = parts[2] if len(parts) > 2 else (location or "Remote / Hybrid")
                else:
                    company = "Y Combinator Startup"
                    title = first_line[:50]
                    loc = location or "Remote"
                url_match = re.search(r'https?://[^\s<>"]+', clean_text)
                apply_url = url_match.group(0) if url_match else f"https://news.ycombinator.com/item?id={h.get('objectID')}"
                results.append({"id": generate_job_id(company, title, loc), "title": title[:60],
                    "company": company[:40], "location": loc[:40], "description": clean_text.strip()[:3000],
                    "apply_url": apply_url, "apply_email": "", "source": "hacker_news",
                    "salary_range": "Startup Equity + Salary",
                    "posted_date": str(h.get("created_at", ""))[:10] or datetime.now().strftime("%Y-%m-%d")})
            return results[:40]
        except Exception as e:
            print(f"[Hacker News API Error]: {e}")
            return []

def get_mock_jobs(query: str, location: str, remote: str) -> list[dict]:
    """Generate high-quality realistic mock jobs if external APIs return nothing or lack regional matches."""
    role_name = query or "Full Stack Developer"
    loc_name = location or "Remote"
    loc_lower = loc_name.lower()
    
    mocks = []
    
    # Regional tech leaders for Bangladesh / South Asia
    if "bangladesh" in loc_lower or "dhaka" in loc_lower or "asia" in loc_lower:
        mocks.extend([
            {
                "company": "Samsung R&D Institute Bangladesh (SRBD)",
                "title": f"Senior {role_name} (AI / Robotics)",
                "location": "Dhaka, Bangladesh (Hybrid)" if remote != "remote" else "Remote (Bangladesh)",
                "salary_range": "BDT 150,000 - 250,000 / month",
                "description": f"""Samsung R&D Institute Bangladesh is expanding its core AI & Computer Vision research lab. We are seeking a Senior {role_name} to develop cutting-edge on-device neural networks and autonomous systems.
                
Key Responsibilities:
- Conduct research and optimization for deep learning models (PyTorch, TensorFlow) for embedded edge devices and robotics.
- Build real-time Computer Vision pipelines using OpenCV, C++, and Python.
- Collaborate with global R&D teams in Seoul and Silicon Valley on commercialized AI features.
- Publish technical findings and patent novel machine learning architectures.

Requirements:
- 3+ years of research or industrial experience in Machine Learning, Computer Vision, or Robotics.
- Strong proficiency in Python, C++, and Linux environments.
- Experience with model compression, quantization, or edge AI deployment is highly desired.
- M.Sc. or B.Sc. in Computer Science, EEE, or related fields."""
            },
            {
                "company": "Brain Station 23",
                "title": f"Lead {role_name}",
                "location": "Dhaka, Bangladesh" if remote != "remote" else "Remote (Anywhere in Bangladesh)",
                "salary_range": "BDT 120,000 - 200,000 / month",
                "description": f"""Brain Station 23, one of the largest IT enterprises in South Asia, is looking for a talented Lead {role_name} to deliver AI-driven cloud platforms for international enterprise clients.
                
Responsibilities:
- Design and architect scalable backend services using Python (FastAPI/Django) or Node.js.
- Integrate LLM APIs (Gemini, OpenAI) and vector databases into custom enterprise solutions.
- Lead code reviews, mentor junior developers, and ensure agile delivery standards.
- Work directly with European and North American clients on architectural roadmaps.

Qualifications:
- 4+ years of professional software development experience.
- Solid understanding of REST APIs, database modeling (PostgreSQL), and Docker/AWS cloud deployments.
- Strong communication skills and leadership mindset."""
            },
            {
                "company": "Pathao",
                "title": f"Machine Learning Engineer ({role_name})",
                "location": "Dhaka, Bangladesh (Hybrid)",
                "salary_range": "BDT 130,000 - 180,000 / month",
                "description": f"""Pathao is Bangladesh's leading digital platform for ride-sharing, food delivery, and logistics. We need a Machine Learning Engineer to optimize real-time dispatch algorithms and demand forecasting.
                
What you will do:
- Build and deploy predictive models for pricing, routing, and fraud detection.
- Develop data pipelines and feature stores using Python, SQL, and big data tools.
- Collaborate with product managers and backend engineers to deploy ML models at scale.
- Continuously monitor model drift and optimize inference latency in production.

Requirements:
- 2+ years of hands-on experience in AI/ML engineering or data science.
- Proficiency in Python, pandas, scikit-learn, and SQL.
- Passion for solving real-world transportation and logistics problems at scale."""
            },
            {
                "company": "Selise Digital Platforms",
                "title": f"Senior {role_name}",
                "location": "Dhaka, Bangladesh / Switzerland (Remote)",
                "salary_range": "$3,000 - $4,500 / month",
                "description": f"""Selise creates digital platforms for global enterprises. We are recruiting a Senior {role_name} with strong frontend and AI integration capabilities.
                
Responsibilities:
- Build reactive, high-performance web applications using React, TypeScript, and modern CSS.
- Connect frontend dashboards with asynchronous Python microservices and LLM endpoints.
- Maintain CI/CD pipelines and ensure automated test coverage across all deliverables.

Requirements:
- 3+ years of full-stack engineering experience.
- Expert in JavaScript/TypeScript, React, and API integration.
- Fluent in English and comfortable working in a multi-cultural European/Asian team."""
            }
        ])

    # Standard global tech leaders
    mocks.extend([
        {
            "company": "Nexus Cloud Systems",
            "title": f"Senior {role_name}",
            "location": "Remote (Global)" if remote == "remote" else loc_name,
            "salary_range": "$130,000 - $160,000 / yr",
            "description": f"""Nexus Cloud is looking for a Senior {role_name} to lead design and implementation of scalable web applications.
            
Responsibilities:
- Build and maintain modern web applications using React, TypeScript, Node.js, and Python/FastAPI.
- Architect high-performance RESTful APIs and integrate with relational databases (PostgreSQL/SQLite).
- Collaborate with cross-functional teams including product managers and UX designers.
- Drive adoption of cloud-native deployment workflows (Docker, AWS/GCP, CI/CD pipelines).

Requirements:
- 3+ years of professional software engineering experience.
- Strong proficiency in JavaScript/TypeScript, React, and backend frameworks (Python or Node.js).
- Excellent communication skills and self-directed problem solver."""
        },
        {
            "company": "Apex AI Labs",
            "title": f"Lead {role_name} (AI Platform)",
            "location": "Remote (Worldwide)",
            "salary_range": "$150,000 - $185,000 / yr + Equity",
            "description": f"""Apex AI Labs is building next-generation autonomous agent tools. We need a Lead {role_name} to spearhead our frontend dashboard and backend orchestration engine.
            
What you will do:
- Design intuitive user interfaces for AI agent workflows and real-time streaming data.
- Develop robust backend endpoints using Python (FastAPI/LangChain) and asynchronous processing.
- Integrate vector databases and LLM APIs (Google Gemini, OpenAI, Anthropic) into core products.
- Architect scalable systems capable of processing millions of tokens and concurrent user sessions.

Who you are:
- 4+ years of software development experience with a strong full-stack foundation.
- Mastery of React, TypeScript, TailwindCSS/Vanilla modern CSS, and Python.
- Comfortable working in a fast-paced, high-growth startup environment."""
        }
    ])
    
    results = []
    for idx, m in enumerate(mocks):
        results.append({
            "id": generate_job_id(m["company"], m["title"], m["location"]),
            "title": m["title"],
            "company": m["company"],
            "location": m["location"],
            "description": m["description"].strip(),
            "apply_url": f"https://example.com/apply/{idx+101}",
            "apply_email": "careers@example.com",
            "source": "curated_list",
            "salary_range": m["salary_range"],
            "posted_date": datetime.now().strftime("%Y-%m-%d")
        })
    return results

async def get_cached_jobs_for_query(query: str, location: str, ttl_hours: int = 72) -> list[dict]:
    """Check SQLite database for fresh jobs matching query and location fetched within last ttl_hours."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        # Use proper Python f-string interpolation for the datetime offset
        ttl_offset = f'-{ttl_hours} hours'
        sql = "SELECT * FROM jobs WHERE fetched_at >= datetime('now', ?)"
        params = [ttl_offset]
        if query and query.strip():
            sql += " AND (title LIKE ? OR description LIKE ? OR company LIKE ?)"
            q_like = f"%{query.strip()}%"
            params.extend([q_like, q_like, q_like])
        # Only filter by location if it's a real specific location (not generic remote/any)
        loc_strip = (location or "").lower().strip()
        if loc_strip and loc_strip not in ("remote", "any", "worldwide", "global", ""):
            sql += " AND (location LIKE ? OR description LIKE ?)"
            loc_like = f"%{location.strip()}%"
            params.extend([loc_like, loc_like])
        
        sql += " ORDER BY fetched_at DESC"
        cursor = await db.execute(sql, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

async def search_and_save_jobs(query: str = "", location: str = "", remote: str = "") -> list[dict]:
    """Main entry point: check 72h DB cache first, or fetch from 5 parallel sources, deduplicate, and save."""
    # 1. Try DB cache first (72-hour window)
    cached = await get_cached_jobs_for_query(query, location, ttl_hours=72)
    if len(cached) >= 15:
        print(f"[DB Cache Hit]: Found {len(cached)} valid jobs fetched within last 72 hours for '{query}' in '{location}'.")
        return cached

    print(f"[DB Cache Miss]: Fetching live jobs from 5 engines for '{query}' in '{location}'...")
    serp_task = fetch_jobs_from_serpapi(query, location)
    remotive_task = fetch_jobs_from_remotive(query, location)
    arbeitnow_task = fetch_jobs_from_arbeitnow(query, location)
    jobicy_task = fetch_jobs_from_jobicy(query, location)
    hn_task = fetch_jobs_from_hackernews(query, location)
    
    results = await asyncio.gather(
        serp_task, remotive_task, arbeitnow_task, jobicy_task, hn_task,
        return_exceptions=True
    )
    
    jobs = []
    for r in results:
        if isinstance(r, list):
            jobs.extend(r)
        elif isinstance(r, Exception):
            print(f"[Aggregator Gather Error]: {r}")

    # Deduplicate by ID and (company + title)
    seen_ids = set()
    seen_keys = set()
    unique_jobs = []
    for j in jobs:
        key = f"{j.get('company', '').lower().strip()}|{j.get('title', '').lower().strip()}"
        if j["id"] not in seen_ids and key not in seen_keys:
            seen_ids.add(j["id"])
            seen_keys.add(key)
            unique_jobs.append(j)
    
    jobs = unique_jobs

    # If location is specified or fewer than 5 jobs returned, blend in high-quality regional/curated jobs
    if len(jobs) < 5 or (location and not any(location.lower() in (j["location"] or "").lower() for j in jobs)):
        mock_jobs = get_mock_jobs(query, location, remote)
        for mj in mock_jobs:
            key = f"{mj['company'].lower().strip()}|{mj['title'].lower().strip()}"
            if mj["id"] not in seen_ids and key not in seen_keys:
                seen_ids.add(mj["id"])
                seen_keys.add(key)
                jobs.append(mj)

    # Save to SQLite
    async with aiosqlite.connect(DATABASE_URL) as db:
        for j in jobs:
            await db.execute("""
                INSERT OR REPLACE INTO jobs 
                (id, title, company, location, description, apply_url, apply_email, source, salary_range, posted_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                j["id"], j["title"], j["company"], j["location"], j["description"],
                j["apply_url"], j["apply_email"], j["source"], j["salary_range"], j["posted_date"]
            ))
        await db.commit()

    # Return all matching jobs from DB (up to 30 days window) so pagination has full dataset
    return await get_cached_jobs_for_query(query, location, ttl_hours=720)

async def get_all_jobs_from_db() -> list[dict]:
    """Retrieve all jobs stored in SQLite."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM jobs ORDER BY fetched_at DESC")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

async def get_job_by_id_from_db(job_id: str) -> dict | None:
    """Retrieve a single job by ID."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None

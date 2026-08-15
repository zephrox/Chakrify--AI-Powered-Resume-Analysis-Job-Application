import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import JobCard from '../components/JobCard';
import MatchBreakdown from '../components/MatchBreakdown';
import CoverLetterModal from '../components/CoverLetterModal';
import JobDetailsModal from '../components/JobDetailsModal';

export default function JobSearch() {
  const [candidate, setCandidate] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState({}); // jobId -> match object
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [scoringAll, setScoringAll] = useState(false);
  const [autoFinding, setAutoFinding] = useState(false);
  const [scoringJobId, setScoringJobId] = useState(null);
  const [error, setError] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Search & Filter state
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState('any');
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'recent'

  // Selected job for modal drawer
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverLetterJob, setCoverLetterJob] = useState(null);
  const [detailsJob, setDetailsJob] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setError('');
    try {
      // 1. Get Candidate Profile
      let cand = null;
      try {
        cand = await api.getProfile();
        setCandidate(cand);
        if (cand?.profile?.target_roles?.length > 0) {
          setQuery(cand.profile.target_roles[0]);
        } else {
          setQuery('Software Engineer');
        }
      } catch (e) {
        console.warn("No candidate profile found:", e);
      }

      // 2. Load existing jobs (page 1, limit 20)
      setIsSearchMode(false);
      const jobsRes = await api.listJobs(1, 20);
      const jobList = jobsRes.jobs || [];
      setJobs(jobList);
      setPage(jobsRes.page || 1);
      setHasMore(jobsRes.has_more || false);
      setTotalJobsCount(jobsRes.total_jobs || jobList.length);

      // 3. Load existing matches if candidate exists
      if (cand && cand.id) {
        const matchesRes = await api.getCandidateMatches(cand.id);
        const matchMap = {};
        (matchesRes.matches || []).forEach(m => {
          matchMap[m.job_id] = m;
        });
        setMatches(matchMap);
      }
    } catch (e) {
      setError(e.message || "Failed to load initial job data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e, resetPage = true) {
    if (e) e.preventDefault();
    setSearching(true);
    setError('');
    setIsSearchMode(true);
    const targetPage = resetPage ? 1 : page;
    try {
      const res = await api.searchJobs(query, location, remote, targetPage, 20);
      setJobs(res.jobs || []);
      setPage(res.page || 1);
      setHasMore(res.has_more || false);
      setTotalJobsCount(res.total_jobs || (res.jobs || []).length);
    } catch (e) {
      setError(e.message || "Job search failed. Please check your network or API settings.");
    } finally {
      setSearching(false);
    }
  }

  async function handlePageChange(targetPage) {
    if (targetPage === page || targetPage < 1 || loadingMore) return;
    setLoadingMore(true);
    try {
      let res;
      if (isSearchMode) {
        res = await api.searchJobs(query, location, remote, targetPage, 20);
      } else {
        res = await api.listJobs(targetPage, 20);
      }
      setJobs(res.jobs || []);
      setPage(res.page || targetPage);
      setHasMore(res.has_more || false);
      setTotalJobsCount(res.total_jobs || ((targetPage - 1) * 20 + (res.jobs || []).length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError("Failed to load page " + targetPage + ": " + e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalJobsCount / 20));
  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
    }
    return pages;
  })();

  async function handleAutoFindSuitable() {
    if (!candidate || !candidate.id) {
      alert("Please upload your CV on the Profile tab before running AI Smart Discovery!");
      return;
    }
    setAutoFinding(true);
    setError('');
    try {
      // 1. Determine best search query from candidate profile
      const roles = candidate.profile?.target_roles || [];
      const skills = candidate.profile?.skills?.primary || [];
      let searchQuery = roles[0] || skills[0] || 'Software Engineer';
      if (roles.length > 1) {
        searchQuery = `${roles[0]} ${roles[1]}`;
      }
      setQuery(searchQuery);

      // 2. Search jobs
      const searchRes = await api.searchJobs(searchQuery, location, remote);
      const newJobs = searchRes.jobs || [];
      setJobs(newJobs);

      // 3. Score all jobs automatically
      if (newJobs.length > 0) {
        const scoreRes = await api.scoreAllJobs(candidate.id);
        const matchMap = { ...matches };
        (scoreRes.matches || []).forEach(m => {
          matchMap[m.job_id] = m;
        });
        setMatches(matchMap);
        setSortBy('score');
        setMinScore(0);
      }
    } catch (e) {
      setError("AI Smart Discovery failed: " + (e.message || str(e)));
    } finally {
      setAutoFinding(false);
    }
  }

  async function handleScoreSingleJob(jobId, openModalWhenDone = false, jobObj = null) {
    if (!candidate || !candidate.id) {
      alert("Please upload your CV on the Profile page before evaluating AI matches!");
      return;
    }
    setScoringJobId(jobId);
    try {
      const res = await api.scoreJob(jobId, candidate.id);
      if (res.match) {
        setMatches(prev => ({ ...prev, [jobId]: res.match }));
        if (openModalWhenDone) {
          const targetJob = jobObj || jobs.find(j => j.id === jobId) || displayedJobs.find(j => j.id === jobId);
          if (targetJob) setSelectedJob(targetJob);
        }
      }
    } catch (e) {
      alert("AI Scoring failed: " + e.message);
    } finally {
      setScoringJobId(null);
    }
  }

  async function handleScoreAll() {
    if (!candidate || !candidate.id) {
      alert("Please upload your CV on the Profile page before evaluating AI matches!");
      return;
    }
    setScoringAll(true);
    try {
      const res = await api.scoreAllJobs(candidate.id);
      const matchMap = { ...matches };
      (res.matches || []).forEach(m => {
        matchMap[m.job_id] = m;
      });
      setMatches(matchMap);
    } catch (e) {
      alert("Batch AI Scoring failed: " + e.message);
    } finally {
      setScoringAll(false);
    }
  }

  // Filter & Sort jobs
  const displayedJobs = jobs.filter(j => {
    const score = matches[j.id]?.score || 0;
    if (minScore > 0 && score < minScore) return false;
    if (location && location.trim() !== '') {
      const locLower = location.toLowerCase().trim();
      const jLoc = (j.location || '').toLowerCase();
      const jDesc = (j.description || '').toLowerCase();
      const isGlobal = jLoc.includes('worldwide') || jLoc.includes('global') || jLoc.includes('anywhere') || jLoc.includes('remote');
      const locMatch = jLoc.includes(locLower) || jDesc.includes(locLower) || isGlobal;
      if (!locMatch) return false;
    }
    if (remote === 'remote') {
      const isRem = (j.location || '').toLowerCase().includes('remote') || (j.title || '').toLowerCase().includes('remote');
      if (!isRem) return false;
    } else if (remote === 'onsite') {
      const isRem = (j.location || '').toLowerCase().includes('remote');
      if (isRem) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'score') {
      const scoreA = matches[a.id]?.score ?? -1;
      const scoreB = matches[b.id]?.score ?? -1;
      return scoreB - scoreA;
    }
    return b.posted_date?.localeCompare(a.posted_date || '') || 0;
  });

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">🔍 AI Job Discovery & Match Engine</h1>
          <p className="page-subtitle">
            Search live opportunities, calculate semantic 0–100 match scores against your CV, and uncover actionable skill gaps.
          </p>
        </div>

        {candidate && (
          <div style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-glow)', padding: '10px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>👤 Active CV: <strong style={{ color: 'var(--text-primary)' }}>{candidate.profile?.full_name || 'Candidate'}</strong></span>
            <span style={{ fontSize: 12, padding: '2px 8px', background: 'var(--brand)', color: '#fff', borderRadius: 12, fontWeight: 700 }}>
              ID #{candidate.id}
            </span>
          </div>
        )}
      </div>

      {!candidate && (
        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          <span>ℹ️</span>
          <div>
            <strong>No active CV found!</strong> You can still search for jobs below, but to calculate 0–100 AI match scores and get personalized resume tips, please upload your CV on the <strong>Profile</strong> tab first!
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* 1-Click AI Best-Fit Discovery Hero Banner */}
      {candidate && (
        <div className="card animate-in" style={{ padding: 24, marginBottom: 24, background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))', border: '1px solid rgba(129, 140, 248, 0.4)', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🚀</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(to right, var(--brand), var(--accent-pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  1-Click AI Best-Fit Discovery
                </h2>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Let Gemini analyze your target roles (<strong style={{ color: 'var(--brand)' }}>{(candidate.profile?.target_roles || []).slice(0, 2).join(', ') || 'Your CV'}</strong>) and core skills to automatically hunt down, import, and score the highest-matching opportunities across all job boards.
              </p>
            </div>

            <div>
              <button 
                onClick={handleAutoFindSuitable} 
                disabled={autoFinding}
                style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: 15, cursor: autoFinding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseOver={(e) => !autoFinding && (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseOut={(e) => !autoFinding && (e.currentTarget.style.transform = 'scale(1)')}
              >
                {autoFinding ? (
                  <>
                    <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
                    <span>Hunting & Scoring Best Matches...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Find Suitable Jobs For Me</span>
                    <span style={{ fontSize: 18 }}>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar Panel */}
      <div className="card" style={{ padding: 24, marginBottom: 24, background: 'linear-gradient(145deg, var(--bg-card), rgba(22, 22, 31, 0.8))' }}>
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: 12, alignItems: 'center' }}>
          <div>
            <label className="text-xs text-muted font-bold" style={{ display: 'block', marginBottom: 4 }}>TARGET ROLE / SKILLS</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. AI Engineer, React Developer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14 }}
            />
          </div>

          <div>
            <label className="text-xs text-muted font-bold" style={{ display: 'block', marginBottom: 4 }}>LOCATION</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. New York, London, Remote..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14 }}
            />
          </div>

          <div>
            <label className="text-xs text-muted font-bold" style={{ display: 'block', marginBottom: 4 }}>WORK TYPE</label>
            <select 
              value={remote}
              onChange={(e) => setRemote(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14 }}
            >
              <option value="any">Any Work Type</option>
              <option value="remote">Remote Only</option>
              <option value="onsite">On-site / Hybrid</option>
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button 
              type="submit" 
              disabled={searching}
              style={{ padding: '12px 28px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 14, cursor: searching ? 'not-allowed' : 'pointer', height: 45, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px var(--brand-glow)' }}
            >
              {searching ? '🔍 Searching...' : '🔍 Search Live Jobs'}
            </button>
          </div>
        </form>
      </div>

      {/* Filter & Batch Score Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <div className="flex items-center gap-16">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Showing <strong>{displayedJobs.length}</strong> of <strong>{totalJobsCount || displayedJobs.length}</strong> cached opportunities
          </span>

          <div className="flex items-center gap-8">
            <label className="text-xs text-muted font-bold">MIN AI SCORE:</label>
            <select 
              value={minScore} 
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
            >
              <option value={0}>All Scores</option>
              <option value={50}>50%+ (Fair & Above)</option>
              <option value={70}>70%+ (Good Matches)</option>
              <option value={85}>85%+ (Excellent Fits)</option>
            </select>
          </div>

          <div className="flex items-center gap-8">
            <label className="text-xs text-muted font-bold">SORT BY:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
            >
              <option value="score">✨ Highest AI Match First</option>
              <option value="recent">🕒 Most Recent</option>
            </select>
          </div>
        </div>

        {candidate && jobs.length > 0 && (
          <button 
            onClick={handleScoreAll} 
            disabled={scoringAll}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13, cursor: scoringAll ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
          >
            {scoringAll ? (
              <>
                <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span>Evaluating 4-Dimension Fits...</span>
              </>
            ) : (
              '✨ Score All Jobs with Gemini AI'
            )}
          </button>
        )}
      </div>

      {/* Job Grid */}
      {loading ? (
        <div className="loading-state card">
          <div className="loading-spinner" />
          <span>Loading job market listings and candidate match scores...</span>
        </div>
      ) : displayedJobs.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">📂</div>
          <h3 className="empty-state-title">No jobs found matching your criteria</h3>
          <p className="text-secondary" style={{ maxWidth: 400, margin: '0 auto 16px' }}>
            Try searching for a different role, clearing your filters, or adjusting the minimum score requirement.
          </p>
          <button 
            onClick={() => { setQuery('Software Engineer'); setMinScore(0); handleSearch(); }}
            style={{ padding: '10px 20px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
          >
            Search Default Listings
          </button>
        </div>
      ) : (
        <div className="job-grid">
          {displayedJobs.map(job => (
            <JobCard 
              key={job.id} 
              job={job} 
              match={matches[job.id]} 
              scoring={scoringJobId === job.id}
              onScoreJob={() => handleScoreSingleJob(job.id, false)}
              onReadDescription={() => setDetailsJob(job)}
              onViewDetails={() => {
                if (matches[job.id]?.score !== undefined) {
                  setSelectedJob(job);
                } else {
                  handleScoreSingleJob(job.id, true, job);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Numbered Pagination Bar (Option 1) */}
      {!loading && totalJobsCount > 0 && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 36, marginBottom: 32, padding: '16px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || loadingMore}
            style={{
              padding: '8px 16px',
              background: page === 1 ? 'var(--bg-primary)' : 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 14,
              cursor: (page === 1 || loadingMore) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ← Prev
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {pageNumbers.map((num, idx) => (
              num === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 8px', color: 'var(--text-muted)', fontWeight: 700 }}>...</span>
              ) : (
                <button
                  key={num}
                  onClick={() => handlePageChange(num)}
                  disabled={loadingMore}
                  style={{
                    minWidth: 36,
                    height: 36,
                    padding: '0 10px',
                    background: num === page ? 'var(--brand)' : 'var(--bg-card)',
                    border: num === page ? '1px solid var(--brand)' : '1px solid var(--border)',
                    color: num === page ? '#ffffff' : 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: num === page ? 800 : 600,
                    fontSize: 14,
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    boxShadow: num === page ? '0 2px 8px var(--brand-glow)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {num}
                </button>
              )
            ))}
          </div>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0 || loadingMore}
            style={{
              padding: '8px 16px',
              background: (page === totalPages || totalPages === 0) ? 'var(--bg-primary)' : 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: (page === totalPages || totalPages === 0) ? 'var(--text-muted)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 14,
              cursor: ((page === totalPages || totalPages === 0) || loadingMore) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Job Details Modal */}
      {detailsJob && (
        <JobDetailsModal
          job={detailsJob}
          match={matches[detailsJob.id]}
          onClose={() => setDetailsJob(null)}
          onOpenAnalysis={(job) => {
            setDetailsJob(null);
            if (matches[job.id]?.score !== undefined) {
              setSelectedJob(job);
            } else {
              handleScoreSingleJob(job.id, true, job);
            }
          }}
          onOpenCoverLetter={(job) => {
            setDetailsJob(null);
            setCoverLetterJob(job);
          }}
        />
      )}

      {/* Match Breakdown Drawer Modal */}
      {selectedJob && (
        <MatchBreakdown 
          job={selectedJob} 
          match={matches[selectedJob.id] || { score: undefined, summary: "Not evaluated yet." }} 
          onClose={() => setSelectedJob(null)}
          onScoreJob={() => handleScoreSingleJob(selectedJob.id, false)}
          scoring={scoringJobId === selectedJob.id}
          onGenerateCoverLetter={(job) => {
            setSelectedJob(null);
            setCoverLetterJob(job);
          }}
        />
      )}

      {/* Cover Letter Studio Modal */}
      {coverLetterJob && (
        <CoverLetterModal
          job={coverLetterJob}
          candidate={candidate}
          onClose={() => setCoverLetterJob(null)}
          onSaved={(letter) => {
            console.log("Cover letter saved!", letter);
          }}
        />
      )}
    </div>
  );
}

import React from 'react';
import ScoreBadge from './ScoreBadge';

export default function JobCard({ job, match, onScoreJob, onViewDetails, onReadDescription, scoring }) {
  const { title, company, location, salary_range, posted_date, source, description } = job;
  const score = match?.score;
  const status = match?.status;
  const bData = match?.breakdown?.breakdown || match?.breakdown || {};
  const matchedSkills = bData?.skills?.matched || [];

  return (
    <div className="job-card animate-in">
      <div className="job-card-header">
        <div>
          <h3 
            className="job-title" 
            onClick={onReadDescription}
            style={{ cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--brand-light)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            title="Click to read full job description & requirements"
          >
            {title} <span style={{ fontSize: 14, opacity: 0.7 }}>👁️</span>
          </h3>
          <div className="job-company">
            <span>🏢 {company}</span>
            <span style={{ padding: '2px 8px', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {source || 'Remote Engine'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {scoring ? (
            <div className="score-badge score-UNSCORED" style={{ padding: '10px 14px' }}>
              <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              <div className="score-badge-label" style={{ marginTop: 4 }}>AI Scoring...</div>
            </div>
          ) : (
            <ScoreBadge 
              score={score} 
              status={status} 
              onClick={() => score !== undefined ? onViewDetails() : onScoreJob()}
            />
          )}
        </div>
      </div>

      <div className="job-meta-row" onClick={onReadDescription} style={{ cursor: 'pointer' }}>
        <div className="job-meta-item">📍 {location || 'Remote'}</div>
        <div className="job-meta-item">💰 {salary_range || 'Competitive'}</div>
        <div className="job-meta-item">🕒 {posted_date || 'Recently'}</div>
      </div>

      <p 
        className="job-description-preview" 
        onClick={onReadDescription} 
        style={{ cursor: 'pointer' }}
        title="Click to read full job description & requirements"
      >
        {description}
      </p>

      {/* Matched skills preview badge */}
      {matchedSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-8" style={{ marginTop: 4 }}>
          <span className="text-xs font-semibold" style={{ color: '#10b981' }}>Top Matched:</span>
          {matchedSkills.slice(0, 4).map((s, idx) => (
            <span key={idx} style={{ padding: '2px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 12, fontSize: 11 }}>
              {s}
            </span>
          ))}
          {matchedSkills.length > 4 && <span className="text-muted text-xs">+{matchedSkills.length - 4} more</span>}
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-12" style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-16 flex-wrap">
          <button
            onClick={onReadDescription}
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--brand-light)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            📄 Read Description
          </button>

          <button 
            onClick={onViewDetails}
            disabled={scoring}
            style={{ background: 'transparent', border: 'none', color: 'var(--brand-light)', fontWeight: 600, fontSize: 13, cursor: scoring ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {scoring ? (
              <>
                <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span>Running Gemini Analysis...</span>
              </>
            ) : (
              <span>📊 AI Match Analysis →</span>
            )}
          </button>
        </div>

        <a 
          href={job.apply_url || '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ padding: '8px 16px', background: 'var(--bg-glass)', border: '1px solid var(--border-hover)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'var(--transition)' }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--brand)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
        >
          Apply ↗
        </a>
      </div>
    </div>
  );
}

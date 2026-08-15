import React from 'react';
import { createPortal } from 'react-dom';
import ScoreBadge from './ScoreBadge';

export default function MatchBreakdown({ match, job, onClose, onGenerateCoverLetter, onScoreJob, scoring }) {
  if (!match || !job) return null;

  const { score, status, breakdown } = match;
  const bData = breakdown?.breakdown || breakdown || {};
  const skills = bData?.skills || {};
  const exp = bData?.experience || {};
  const domain = bData?.domain || {};
  const edu = bData?.education || {};
  const summary = match.summary || breakdown?.summary || bData?.summary || 'No executive summary provided.';
  const tips = breakdown?.resume_tips || bData?.resume_tips || [];

  const getBarColor = (val) => {
    if (val >= 80) return '#10b981';
    if (val >= 60) return '#6366f1';
    if (val >= 40) return '#fbbf24';
    return '#ef4444';
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="flex items-center gap-12">
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{job.title}</h2>
              <ScoreBadge score={score} status={status} />
            </div>
            <div style={{ fontSize: 15, color: 'var(--brand-light)', fontWeight: 600, marginTop: 4 }}>
              {job.company} • <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{job.location}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {score === undefined ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(99, 102, 241, 0.4)', margin: '10px 0 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                AI Match Evaluation Not Calculated Yet
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.6 }}>
                We haven't run the 4-dimension semantic evaluation against your resume for this position yet. Click below to have Gemini AI analyze your skills and seniority right now!
              </p>
              {onScoreJob && (
                <button 
                  onClick={onScoreJob} 
                  disabled={scoring}
                  style={{ padding: '12px 28px', background: 'linear-gradient(135deg, var(--brand), #818cf8)', border: 'none', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: 15, cursor: scoring ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' }}
                >
                  {scoring ? (
                    <>
                      <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 3 }} />
                      <span>Running Gemini 4-Dimension Analysis...</span>
                    </>
                  ) : (
                    <span>✨ Run AI Match Evaluation Now</span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Executive Summary */}
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  🤖 AI Executive Summary
                </div>
                <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {summary}
                </p>
              </div>

          {/* 4 Dimension Scoring Breakdown */}
          <div>
            <div className="profile-section-title">Match Breakdown (0–100)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Skills */}
              <div className="breakdown-row">
                <div className="breakdown-header">
                  <span>Technical Skills (40%)</span>
                  <span style={{ color: getBarColor(skills.score || 0) }}>{skills.score || 0}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${skills.score || 0}%`, background: getBarColor(skills.score || 0) }} />
                </div>
              </div>

              {/* Experience */}
              <div className="breakdown-row">
                <div className="breakdown-header">
                  <span>Experience & Seniority (30%)</span>
                  <span style={{ color: getBarColor(exp.score || 0) }}>{exp.score || 0}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${exp.score || 0}%`, background: getBarColor(exp.score || 0) }} />
                </div>
                {exp.reason && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{exp.reason}</div>}
              </div>

              {/* Domain */}
              <div className="breakdown-row">
                <div className="breakdown-header">
                  <span>Domain & Industry Fit (20%)</span>
                  <span style={{ color: getBarColor(domain.score || 0) }}>{domain.score || 0}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${domain.score || 0}%`, background: getBarColor(domain.score || 0) }} />
                </div>
                {domain.reason && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{domain.reason}</div>}
              </div>

              {/* Education */}
              <div className="breakdown-row">
                <div className="breakdown-header">
                  <span>Education & Certs (10%)</span>
                  <span style={{ color: getBarColor(edu.score || 0) }}>{edu.score || 0}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${edu.score || 0}%`, background: getBarColor(edu.score || 0) }} />
                </div>
                {edu.reason && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{edu.reason}</div>}
              </div>
            </div>
          </div>

          {/* Matched & Missing Skills Tags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: 10 }}>
                ✅ Matched Skills ({skills.matched?.length || 0})
              </div>
              <div className="flex flex-wrap gap-8">
                {(skills.matched || []).map((s, idx) => (
                  <span key={idx} style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
                {(!skills.matched || skills.matched.length === 0) && <span className="text-muted text-xs">None identified</span>}
              </div>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: 10 }}>
                ⚠️ Missing Skills ({skills.missing?.length || 0})
              </div>
              <div className="flex flex-wrap gap-8">
                {(skills.missing || []).map((s, idx) => (
                  <span key={idx} style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
                {(!skills.missing || skills.missing.length === 0) && <span className="text-muted text-xs">No missing skills! 🎉</span>}
              </div>
            </div>
          </div>

          {/* Actionable Resume Tips */}
          {tips.length > 0 && (
            <div>
              <div className="profile-section-title">💡 Tailoring Tips for this Job</div>
              <div className="flex flex-col gap-12">
                {tips.map((tip, idx) => (
                  <div key={idx} className="tip-card">
                    <span style={{ fontWeight: 700, marginRight: 6 }}>Tip #{idx + 1}:</span>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Description Preview / Full */}
          <div>
            <div className="profile-section-title">Job Description</div>
            <div style={{ background: 'var(--bg-glass)', padding: 20, borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--text-secondary)', maxHeight: 250, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {job.description || 'No description provided.'}
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
          <div className="flex justify-between items-center" style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <a 
              href={job.apply_url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ textDecoration: 'none', padding: '12px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
            >
              🔗 Open Apply Link ↗
            </a>
            
            <button 
              onClick={() => {
                onClose();
                if (onGenerateCoverLetter) onGenerateCoverLetter(job);
              }}
              style={{ padding: '12px 28px', background: 'linear-gradient(135deg, var(--brand), #818cf8)', border: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)' }}
            >
              ✨ Open AI Cover Letter Studio 🚀
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

import React from 'react';
import { createPortal } from 'react-dom';
import ScoreBadge from './ScoreBadge';
import { ExternalLink, Sparkles, BarChart2, Building2, MapPin, DollarSign, Clock, Tag } from 'lucide-react';

export default function JobDetailsModal({ job, match, onClose, onOpenAnalysis, onOpenCoverLetter }) {
  if (!job) return null;

  const { title, company, location, salary_range, posted_date, source, description, apply_url } = job;
  const score = match?.score;
  const status = match?.status;

  // Try to format description paragraphs nicely
  const paragraphs = (description || 'No detailed description provided for this listing.').split('\n\n').filter(Boolean);

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div className="modal-content animate-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div style={{ flex: 1, marginRight: 16 }}>
            <div className="flex items-center gap-12 flex-wrap mb-4">
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
              {score !== undefined ? (
                <ScoreBadge score={score} status={status} />
              ) : (
                <span style={{ padding: '4px 12px', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  🤖 AI Score Uncalculated
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-16 text-sm" style={{ color: 'var(--brand-light)', fontWeight: 600, marginTop: 8 }}>
              <span className="flex items-center gap-6">
                <Building2 size={16} /> {company}
              </span>
              <span className="flex items-center gap-6" style={{ color: 'var(--text-secondary)' }}>
                <MapPin size={16} /> {location || 'Remote'}
              </span>
              <span className="flex items-center gap-6" style={{ color: '#10b981' }}>
                <DollarSign size={16} /> {salary_range || 'Competitive'}
              </span>
              <span className="flex items-center gap-6" style={{ color: 'var(--text-muted)' }}>
                <Clock size={16} /> {posted_date || 'Recently Posted'}
              </span>
              {source && (
                <span className="flex items-center gap-6" style={{ padding: '2px 8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 12, fontSize: 11, color: 'var(--brand-light)' }}>
                  <Tag size={12} /> {source}
                </span>
              )}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Modal Body - Scrollable Job Description */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 16 }}>
              📄 Full Job Description & Requirements
            </h3>
            
            <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans, sans-serif)' }}>
              {description || 'No detailed description available.'}
            </div>
          </div>

          {/* Prompt banner to use AI features if not scored yet */}
          <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(129, 140, 248, 0.05))', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', alignItems: 'center', justify: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Want to know if you're a strong fit for this role?
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Let our Gemini AI analyze your CV against this exact description to give you a 4-dimension match breakdown and custom tailoring tips!
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAnalysis(job);
              }}
              style={{ padding: '10px 20px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <BarChart2 size={16} /> Run AI Match Analysis
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            {apply_url && (
              <a
                href={apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ textDecoration: 'none', padding: '12px 24px', background: 'var(--bg-glass)', border: '1px solid var(--border-hover)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}
              >
                🔗 Open Company Apply Page <ExternalLink size={16} />
              </a>
            )}
          </div>

          <div className="flex items-center gap-12">
            <button
              onClick={() => {
                onClose();
                onOpenAnalysis(job);
              }}
              style={{ padding: '12px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <BarChart2 size={16} /> {score !== undefined ? '📊 View AI Match & Tips' : '⚡ Score Fit (0-100)'}
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenCoverLetter(job);
              }}
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg, var(--brand), #818cf8)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}
            >
              <Sparkles size={16} /> ✨ Open Cover Letter Studio
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}

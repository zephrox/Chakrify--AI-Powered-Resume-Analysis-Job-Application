import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';

const tones = [
  { id: 'professional', label: '👔 Professional', desc: 'Balanced, formal, and polished' },
  { id: 'enthusiastic', label: '🚀 Enthusiastic', desc: 'High energy, passionate, and eager' },
  { id: 'technical', label: '⚡ Technical', desc: 'Focused on architecture, stack, and metrics' },
  { id: 'executive', label: '👑 Executive', desc: 'Leadership, strategic impact, and vision' },
];

export default function CoverLetterModal({ job, candidate, onClose, onSaved }) {
  const [tone, setTone] = useState('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (job && candidate) {
      generateLetter('professional', '');
    }
  }, [job, candidate]);

  async function generateLetter(selectedTone, instructions) {
    setLoading(true);
    setError('');
    try {
      const res = await api.generateCoverLetter(job.id, candidate.id, selectedTone, instructions);
      if (res && res.cover_letter) {
        setContent(res.cover_letter.content);
        setSavedId(res.cover_letter.id);
        if (onSaved) onSaved(res.cover_letter);
      } else {
        setError('Failed to generate cover letter. Unexpected response.');
      }
    } catch (e) {
      setError(e.message || 'Error generating letter');
    } finally {
      setLoading(false);
    }
  }

  function handleToneChange(newTone) {
    setTone(newTone);
    generateLetter(newTone, customInstructions);
  }

  function handleRefresh() {
    generateLetter(tone, customInstructions);
  }

  async function handleSaveEdit() {
    if (!savedId) return;
    try {
      await api.updateCoverLetter(savedId, content, tone);
      setIsEditing(false);
      alert("Cover letter changes saved to your application archive! 🎉");
      if (onSaved) onSaved({ id: savedId, content, tone, job_id: job.id });
    } catch (err) {
      alert("Failed to save edit: " + err.message);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleDownload() {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Cover_Letter_${job.company.replace(/\s+/g, '_')}_${job.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content animate-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div>
            <div className="flex items-center gap-12 mb-4">
              <span style={{ fontSize: 24 }}>✨</span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                AI Cover Letter Studio
              </h2>
            </div>
            <div style={{ fontSize: 14, color: 'var(--brand-light)', fontWeight: 600 }}>
              Tailored for <span style={{ color: '#fff' }}>{job.title}</span> at <span style={{ color: '#fff' }}>{job.company}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Studio Controls */}
        <div style={{ padding: '20px 32px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 16 }}>
            <label className="profile-field-label" style={{ marginBottom: 8, display: 'block' }}>
              1. Select Tone & Style:
            </label>
            <div className="flex flex-wrap gap-12">
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleToneChange(t.id)}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: tone === t.id ? 'var(--brand)' : 'var(--border)',
                    background: tone === t.id ? 'var(--brand-dim)' : 'var(--bg-card)',
                    color: tone === t.id ? '#fff' : 'var(--text-secondary)',
                    fontWeight: tone === t.id ? 700 : 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'var(--transition)',
                    fontSize: 13
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="profile-field-label" style={{ marginBottom: 6, display: 'block' }}>
              2. Custom Focus / Instructions (Optional):
            </label>
            <div className="flex gap-12">
              <input
                type="text"
                placeholder="e.g., Mention my React Native leadership at Samsung, or emphasize my fast learning speed..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRefresh()}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: 13
                }}
              />
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    <span>Tailoring...</span>
                  </>
                ) : (
                  <span>🔄 Refresh</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 32, position: 'relative', minHeight: 320 }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="loading-spinner" style={{ width: 44, height: 44, borderWidth: 4, marginBottom: 20 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Crafting Your Tailored Application...
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 420, fontSize: 14, lineHeight: 1.6 }}>
                Our AI is analyzing your achievements and mapping them to the responsibilities of <strong>{job.title}</strong> at <strong>{job.company}</strong> in a {tone} tone.
              </p>
            </div>
          ) : error ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Generation Notice</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>{error}</p>
              <button onClick={handleRefresh} className="btn btn-secondary" style={{ fontSize: 13 }}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-12">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {isEditing ? 'EDIT MODE (MODIFY TEXT DIRECTLY)' : 'PREVIEW MODE (CLEAN DOCUMENT VIEW)'}
                </span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  {isEditing ? '👁️ View Clean Preview' : '✏️ Edit Text'}
                </button>
              </div>

              {isEditing ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 340,
                    padding: 20,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--brand)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    fontSize: 14,
                    lineHeight: 1.6,
                    resize: 'vertical'
                  }}
                />
              ) : (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  padding: 32,
                  borderRadius: 'var(--radius-lg)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-sans, sans-serif)',
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: 'var(--text-primary)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {content || 'No content generated yet.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 18px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-hover)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'inline-block'
                }}
              >
                🔗 Open Apply Portal ↗
              </a>
            )}
          </div>

          <div className="flex gap-12">
            <button
              onClick={handleDownload}
              disabled={loading || !content}
              style={{
                padding: '10px 20px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 13,
                cursor: (loading || !content) ? 'not-allowed' : 'pointer',
                opacity: (loading || !content) ? 0.5 : 1
              }}
            >
              📄 Download .TXT
            </button>

            {isEditing ? (
              <button
                onClick={handleSaveEdit}
                style={{ padding: '10px 20px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                💾 Save Changes
              </button>
            ) : (
              <button
                onClick={handleCopy}
                disabled={loading || !content}
                style={{
                  padding: '10px 24px',
                  background: copied ? '#10b981' : 'linear-gradient(135deg, var(--brand), #818cf8)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: (loading || !content) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !content) ? 0.5 : 1,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  transition: 'var(--transition)'
                }}
              >
                {copied ? (
                  <>
                    <span>✅ Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <span>📋 Copy Cover Letter</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}

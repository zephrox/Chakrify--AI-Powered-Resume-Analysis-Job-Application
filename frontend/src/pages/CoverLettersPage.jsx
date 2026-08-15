import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { Briefcase, Trash2, Copy, Download, ExternalLink, Edit3, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CoverLettersPage() {
  const [candidate, setCandidate] = useState(null);
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const candRes = await api.getProfile();
      if (candRes && candRes.id) {
        setCandidate(candRes);
        const clRes = await api.getCandidateCoverLetters(candRes.id);
        if (clRes && clRes.cover_letters) {
          setLetters(clRes.cover_letters);
        }
      }
    } catch (err) {
      console.log("No profile or cover letters found yet", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this cover letter?")) return;
    try {
      await api.deleteCoverLetter(id);
      setLetters(letters.filter(l => l.id !== id));
      if (selectedLetter && selectedLetter.id === id) setSelectedLetter(null);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }

  async function handleSaveEdit() {
    if (!selectedLetter) return;
    try {
      const res = await api.updateCoverLetter(selectedLetter.id, editContent, selectedLetter.tone);
      if (res.cover_letter) {
        setSelectedLetter(res.cover_letter);
        setLetters(letters.map(l => l.id === res.cover_letter.id ? res.cover_letter : l));
        setIsEditing(false);
        alert("Cover letter updated successfully!");
      }
    } catch (err) {
      alert("Failed to save edits: " + err.message);
    }
  }

  function handleCopy(content, id, e) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleDownload(letter, e) {
    if (e) e.stopPropagation();
    const element = document.createElement("a");
    const file = new Blob([letter.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Cover_Letter_${(letter.job_company || 'Company').replace(/\s+/g, '_')}_${(letter.job_title || 'Role').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  return (
    <div className="page-container animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📄 Cover Letters & Application Archive</h1>
          <p className="page-subtitle">
            Review, edit, and download your AI-tailored cover letters generated across all job applications.
          </p>
        </div>
        <Link to="/jobs" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} /> Craft New Cover Letter
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 4, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your application archive...</p>
        </div>
      ) : !candidate ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', maxWidth: 540, margin: '40px auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Upload Your CV First</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            To generate personalized cover letters, please upload your resume on the Profile tab so our AI knows your technical achievements and background.
          </p>
          <Link to="/profile" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Go to My Profile →
          </Link>
        </div>
      ) : letters.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', maxWidth: 580, margin: '40px auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Cover Letters Yet!</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            You haven't generated any cover letters yet. Head over to the Job Search tab, click on any job that catches your eye, and click <strong>"✨ Open AI Cover Letter Studio"</strong>!
          </p>
          <Link to="/jobs" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Explore Jobs Now →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {letters.map((l) => (
            <div
              key={l.id}
              className="card job-card"
              onClick={() => {
                setSelectedLetter(l);
                setIsEditing(false);
                setEditContent(l.content);
              }}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {l.job_title || 'Software Engineer'}
                    </h3>
                    <div style={{ fontSize: 14, color: 'var(--brand-light)', fontWeight: 600 }}>
                      {l.job_company || 'Tech Company'}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--brand-light)',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}>
                    {l.tone || 'Professional'}
                  </span>
                </div>

                <p style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: 16,
                  background: 'var(--bg-glass)',
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontFamily: 'monospace'
                }}>
                  {l.content}
                </p>
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Created on: {l.created_at ? l.created_at.slice(0, 10) : 'Today'}
                </div>

                <div className="flex justify-between items-center" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="flex gap-8">
                    <button
                      onClick={(e) => handleCopy(l.content, l.id, e)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: copiedId === l.id ? '#10b981' : 'var(--bg-glass)',
                        color: copiedId === l.id ? '#fff' : 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {copiedId === l.id ? <Check size={14} /> : <Copy size={14} />}
                      {copiedId === l.id ? 'Copied' : 'Copy'}
                    </button>

                    <button
                      onClick={(e) => handleDownload(l, e)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-glass)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Download size={14} /> .TXT
                    </button>
                  </div>

                  <button
                    onClick={(e) => handleDelete(l.id, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: 6,
                      opacity: 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    title="Delete Letter"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedLetter && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedLetter(null)} style={{ zIndex: 1100 }}>
          <div className="modal-content animate-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedLetter.job_title}
                </h2>
                <div style={{ fontSize: 14, color: 'var(--brand-light)', fontWeight: 600 }}>
                  {selectedLetter.job_company} • <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{selectedLetter.tone} tone</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedLetter(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div className="flex justify-between items-center mb-12">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {isEditing ? 'EDITING LETTER CONTENT...' : 'CLEAN PREVIEW'}
                </span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--brand-light)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Edit3 size={14} /> {isEditing ? 'Switch to Preview' : 'Edit Content'}
                </button>
              </div>

              {isEditing ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 380,
                      padding: 20,
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--brand)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontSize: 14,
                      lineHeight: 1.6,
                      resize: 'vertical'
                    }}
                  />
                  <div className="flex justify-end gap-12 mt-12">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      style={{ padding: '8px 20px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                      💾 Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  padding: 28,
                  borderRadius: 'var(--radius-lg)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-sans, sans-serif)',
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: 'var(--text-primary)'
                }}>
                  {selectedLetter.content}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {selectedLetter.job_apply_url && (
                  <a
                    href={selectedLetter.job_apply_url}
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    🔗 Open Job Page <ExternalLink size={14} />
                  </a>
                )}
              </div>

              <div className="flex gap-12">
                <button
                  onClick={(e) => handleDownload(selectedLetter, e)}
                  style={{
                    padding: '10px 18px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Download size={16} /> Download .TXT
                </button>

                <button
                  onClick={(e) => handleCopy(selectedLetter.content, selectedLetter.id, e)}
                  style={{
                    padding: '10px 24px',
                    background: copiedId === selectedLetter.id ? '#10b981' : 'linear-gradient(135deg, var(--brand), #818cf8)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copiedId === selectedLetter.id ? (
                    <>
                      <Check size={18} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} /> Copy to Clipboard
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

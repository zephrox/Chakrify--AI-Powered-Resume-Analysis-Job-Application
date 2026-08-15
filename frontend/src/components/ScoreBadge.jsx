import React from 'react';

export default function ScoreBadge({ score, status, onClick }) {
  if (score === undefined || score === null) {
    return (
      <button 
        onClick={onClick}
        className="score-badge score-UNSCORED" 
        style={{ cursor: 'pointer', padding: '10px 16px', background: 'var(--brand-dim)', border: '1px solid var(--brand-glow)', color: 'var(--brand-light)' }}
        title="Click to evaluate AI Match Score"
      >
        <span style={{ fontSize: 13, fontWeight: 700 }}>✨ AI Match</span>
      </button>
    );
  }

  const statusClass = status ? `score-${status}` : 'score-GOOD';

  return (
    <div 
      onClick={onClick} 
      className={`score-badge ${statusClass}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={onClick ? "Click to view full match analysis" : ""}
    >
      <div className="score-badge-val">{score}%</div>
      <div className="score-badge-label">{status || 'MATCH'}</div>
    </div>
  );
}

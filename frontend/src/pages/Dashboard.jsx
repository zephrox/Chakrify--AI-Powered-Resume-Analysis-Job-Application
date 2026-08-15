import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowRight, ChevronRight } from 'lucide-react';

function StatCard({ label, value, icon, color, bg, loading }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg, color: color }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 24, color: color }}>
        {loading ? (
          <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2, margin: '4px 0' }} />
        ) : value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.getProfile().catch(() => null),
      api.getStats().catch(() => null),
    ]).then(([profileRes, statsRes]) => {
      if (profileRes) setProfile(profileRes.profile ?? profileRes);
      if (statsRes) setStats(statsRes.stats);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Profile Status',
      value: profile ? 'Active' : 'Empty',
      icon: '👤',
      color: profile ? 'var(--score-excellent)' : 'var(--text-muted)',
      bg: profile ? 'rgba(16,185,129,0.1)' : 'var(--bg-glass)',
    },
    {
      label: 'Jobs in Database',
      value: stats ? stats.total_jobs.toLocaleString() : '—',
      icon: '🔍',
      color: 'var(--brand)',
      bg: 'var(--brand-dim)',
    },
    {
      label: 'Cover Letters',
      value: stats ? stats.total_cover_letters : '—',
      icon: '✉️',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
    },
    {
      label: 'Avg Match Score',
      value: stats && stats.total_matches > 0 ? `${stats.avg_match_score}%` : '—',
      icon: '📊',
      color: 'var(--score-excellent)',
      bg: 'rgba(16,185,129,0.1)',
    },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">
          {profile ? `Welcome back, ${profile.full_name?.split(' ')[0] || 'there'} 👋` : 'Welcome to JobApply AI 🚀'}
        </h1>
        <p className="page-subtitle">
          {profile
            ? `You have ${profile.skills?.primary?.length || 0} primary skills ready to match against ${stats?.total_jobs?.toLocaleString() ?? '...'} live job listings.`
            : 'Upload your resume to get started with AI-powered job matching.'}
        </p>
      </div>

      {/* Live Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} loading={loading} />
        ))}
      </div>

      {/* Top Match Banner (only if we have matches) */}
      {stats && stats.top_match_score > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, #1e40af 100%)',
          borderRadius: 'var(--radius-md)', padding: '20px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, color: '#fff'
        }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600, marginBottom: 4 }}>🏆 YOUR BEST MATCH SO FAR</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.top_match_score}% Match Score</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>Across {stats.total_matches} evaluated job{stats.total_matches !== 1 ? 's' : ''}</div>
          </div>
          <button
            className="btn"
            onClick={() => navigate('/jobs')}
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
          >
            View All Jobs <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Getting Started or Quick Actions */}
      {!profile ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📄</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Start by uploading your CV</h2>
          <p className="text-secondary" style={{ marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
            Our AI will analyze your skills, experience, and background to build your candidate profile.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/profile')}>
            Upload Resume <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {/* Profile Summary */}
          <div className="card">
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Your Profile</h3>
              <button className="btn btn-ghost" onClick={() => navigate('/profile')} style={{ fontSize: 13 }}>
                Edit <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="text-sm text-muted" style={{ marginBottom: 6 }}>Primary Skills</div>
                <div className="flex flex-wrap gap-8">
                  {profile.skills?.primary?.slice(0, 6).map(skill => (
                    <span key={skill} className="skill-tag primary">{skill}</span>
                  ))}
                </div>
              </div>
              <div className="divider" style={{ margin: '8px 0' }} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Experience</span>
                <span className="text-sm font-semibold">{profile.total_years_exp} years</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Target Roles</span>
                <span className="text-sm font-semibold" style={{ textAlign: 'right', maxWidth: '60%' }}>
                  {profile.target_roles?.slice(0, 2).join(', ')}
                </span>
              </div>
              {stats && stats.total_matches > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">AI Evaluations</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--score-excellent)' }}>{stats.total_matches} jobs scored</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🔍', label: 'Search Jobs', sub: `Browse ${stats?.total_jobs?.toLocaleString() ?? '...'} opportunities`, to: '/jobs', color: 'var(--brand)' },
                { icon: '✉️', label: 'Cover Letters', sub: `${stats?.total_cover_letters ?? 0} generated`, to: '/cover-letters', color: '#f59e0b' },
                { icon: '👤', label: 'View Profile', sub: 'Review your parsed resume', to: '/profile', color: 'var(--score-excellent)' },
                { icon: '⚙️', label: 'Settings', sub: 'Scoring weights & preferences', to: '/settings', color: '#a78bfa' },
              ].map(action => (
                <button
                  key={action.label}
                  className="btn btn-secondary"
                  onClick={() => navigate(action.to)}
                  style={{ justifyContent: 'flex-start', padding: '14px 16px', gap: 14 }}
                >
                  <span style={{ fontSize: 22 }}>{action.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{action.label}</div>
                    <div className="text-xs text-muted">{action.sub}</div>
                  </div>
                  <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

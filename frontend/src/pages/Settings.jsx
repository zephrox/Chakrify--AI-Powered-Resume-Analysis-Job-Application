import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Save, RotateCcw, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';

function TagInput({ label, tags, onAdd, onRemove, placeholder }) {
  const [inputVal, setInputVal] = useState('');

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault();
      onAdd(inputVal.trim());
      setInputVal('');
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <label className="text-sm font-bold" style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
        {label}
      </label>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 12px',
        background: 'var(--bg-primary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', minHeight: 46
      }}>
        {tags.map(tag => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--brand-dim)', color: 'var(--brand)',
            padding: '3px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600
          }}>
            {tag}
            <button onClick={() => onRemove(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--brand)', lineHeight: 1 }}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : 'Add more...'}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--text-primary)', minWidth: 120, flex: 1
          }}
        />
      </div>
      <p className="text-xs text-muted" style={{ marginTop: 5 }}>Press Enter or comma to add</p>
    </div>
  );
}

function WeightSlider({ label, value, onChange, color }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</label>
        <span style={{
          background: color + '22', color: color,
          padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 700
        }}>{value}%</span>
      </div>
      <input
        type="range" min={5} max={70} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, height: 6, cursor: 'pointer' }}
      />
    </div>
  );
}

const DEFAULT_PREFS = {
  target_roles: [],
  preferred_location: '',
  remote_preference: 'any',
  min_score_display: 50,
  blacklisted_companies: [],
  blacklisted_keywords: [],
  scoring_weights: { skills: 40, experience: 30, domain: 20, education: 10 }
};

export default function Settings() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [originalPrefs, setOriginalPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // {type: 'success'|'error', msg: ''}

  const weightTotal = Object.values(prefs.scoring_weights).reduce((a, b) => a + b, 0);
  const isDirty = JSON.stringify(prefs) !== JSON.stringify(originalPrefs);

  useEffect(() => {
    api.getPreferences()
      .then(res => {
        setPrefs(res.preferences);
        setOriginalPrefs(res.preferences);
      })
      .catch(() => {
        setPrefs(DEFAULT_PREFS);
        setOriginalPrefs(DEFAULT_PREFS);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateWeight = (key, val) => {
    setPrefs(p => ({ ...p, scoring_weights: { ...p.scoring_weights, [key]: val } }));
  };

  const handleSave = async () => {
    if (weightTotal < 99 || weightTotal > 101) {
      setStatus({ type: 'error', msg: `Scoring weights must sum to 100. Currently: ${weightTotal}%` });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await api.savePreferences(prefs);
      setPrefs(res.preferences);
      setOriginalPrefs(res.preferences);
      setStatus({ type: 'success', msg: 'Preferences saved successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus({ type: 'error', msg: e.message || 'Failed to save preferences.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrefs(originalPrefs);
    setStatus(null);
  };

  if (loading) return (
    <div className="animate-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Settings & Preferences</h1>
        <p className="page-subtitle">Customize how jobs are scored and filtered for you</p>
      </div>

      {/* Status Banner */}
      {status && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 20px', borderRadius: 'var(--radius-sm)', marginBottom: 24,
          background: status.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${status.type === 'success' ? 'var(--score-excellent)' : 'var(--score-poor)'}`,
          color: status.type === 'success' ? 'var(--score-excellent)' : 'var(--score-poor)',
          fontWeight: 600, fontSize: 14
        }}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {status.msg}
        </div>
      )}

      <div className="grid-2" style={{ gap: 24 }}>

        {/* ── AI Scoring Weights ── */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>🤖 AI Scoring Weights</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
            How much each factor contributes to the overall match score. Must total exactly 100%.
          </p>

          <WeightSlider label="Technical Skills Match" value={prefs.scoring_weights.skills} onChange={v => updateWeight('skills', v)} color="var(--brand)" />
          <WeightSlider label="Experience & Seniority" value={prefs.scoring_weights.experience} onChange={v => updateWeight('experience', v)} color="var(--score-excellent)" />
          <WeightSlider label="Domain & Industry Fit" value={prefs.scoring_weights.domain} onChange={v => updateWeight('domain', v)} color="#f59e0b" />
          <WeightSlider label="Education & Certs" value={prefs.scoring_weights.education} onChange={v => updateWeight('education', v)} color="#a78bfa" />

          {/* Total bar */}
          <div style={{
            marginTop: 4, padding: '10px 16px',
            background: weightTotal === 100 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${weightTotal === 100 ? 'var(--score-excellent)' : 'var(--score-poor)'}`,
            borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span className="text-sm font-bold">Total</span>
            <span style={{
              fontWeight: 800, fontSize: 16,
              color: weightTotal === 100 ? 'var(--score-excellent)' : 'var(--score-poor)'
            }}>{weightTotal}%</span>
          </div>
        </div>

        {/* ── Job Search Preferences ── */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>🎯 Job Search Defaults</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
            Set your default search preferences for every session.
          </p>

          {/* Remote Preference */}
          <div style={{ marginBottom: 24 }}>
            <label className="text-sm font-bold" style={{ display: 'block', marginBottom: 8 }}>Work Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['any', '🌐 Any'], ['remote', '🏠 Remote Only'], ['onsite', '🏢 On-site Only']].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setPrefs(p => ({ ...p, remote_preference: val }))}
                  style={{
                    flex: 1, padding: '10px 8px', fontSize: 12, fontWeight: 700,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s',
                    background: prefs.remote_preference === val ? 'var(--brand)' : 'var(--bg-primary)',
                    color: prefs.remote_preference === val ? '#fff' : 'var(--text-secondary)',
                    border: `2px solid ${prefs.remote_preference === val ? 'var(--brand)' : 'var(--border)'}`
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Location */}
          <div style={{ marginBottom: 24 }}>
            <label className="text-sm font-bold" style={{ display: 'block', marginBottom: 8 }}>Preferred Location</label>
            <input
              type="text"
              value={prefs.preferred_location}
              onChange={e => setPrefs(p => ({ ...p, preferred_location: e.target.value }))}
              placeholder="e.g. Dhaka, Bangladesh or Remote"
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Min Score Display */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <label className="text-sm font-bold">Min Score to Display</label>
              <span style={{
                background: 'var(--brand-dim)', color: 'var(--brand)',
                padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 700
              }}>{prefs.min_score_display}%+</span>
            </div>
            <input
              type="range" min={0} max={90} step={5} value={prefs.min_score_display}
              onChange={e => setPrefs(p => ({ ...p, min_score_display: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
            />
            <div className="flex justify-between text-xs text-muted" style={{ marginTop: 4 }}>
              <span>0% (Show all)</span><span>90% (Only excellent)</span>
            </div>
          </div>
        </div>

        {/* ── Target Roles ── */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>🎭 Target Roles</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Job titles you want to appear in auto-search. Synced from your CV but editable here.
          </p>
          <TagInput
            label="" tags={prefs.target_roles}
            onAdd={tag => setPrefs(p => ({ ...p, target_roles: [...new Set([...p.target_roles, tag])] }))}
            onRemove={tag => setPrefs(p => ({ ...p, target_roles: p.target_roles.filter(r => r !== tag) }))}
            placeholder="e.g. Software Engineer, AI Engineer"
          />
        </div>

        {/* ── Blacklists ── */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>🚫 Blacklists</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Companies or keywords to automatically hide from your results.
          </p>
          <TagInput
            label="Blacklisted Companies" tags={prefs.blacklisted_companies}
            onAdd={tag => setPrefs(p => ({ ...p, blacklisted_companies: [...new Set([...p.blacklisted_companies, tag])] }))}
            onRemove={tag => setPrefs(p => ({ ...p, blacklisted_companies: p.blacklisted_companies.filter(c => c !== tag) }))}
            placeholder="e.g. Company Name"
          />
          <TagInput
            label="Blacklisted Keywords" tags={prefs.blacklisted_keywords}
            onAdd={tag => setPrefs(p => ({ ...p, blacklisted_keywords: [...new Set([...p.blacklisted_keywords, tag])] }))}
            onRemove={tag => setPrefs(p => ({ ...p, blacklisted_keywords: p.blacklisted_keywords.filter(k => k !== tag) }))}
            placeholder="e.g. unpaid, internship"
          />
        </div>
      </div>

      {/* ── Save Bar ── */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 32, borderRadius: 'var(--radius-md)', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)'
      }}>
        <span className="text-sm text-muted">
          {isDirty ? '● Unsaved changes' : '✓ All changes saved'}
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleReset}
            disabled={!isDirty || saving}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || weightTotal !== 100}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}
          >
            {saving ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

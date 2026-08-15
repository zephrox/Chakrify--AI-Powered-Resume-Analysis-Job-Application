import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Upload, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

function ScoreBar({ label, value, max = 10 }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span className="text-sm">{label}</span>
        <span className="text-sm text-muted">{value}/{max}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(value / max) * 100}%`,
          background: 'linear-gradient(90deg, var(--brand), #a78bfa)',
          borderRadius: 3,
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)'
        }} />
      </div>
    </div>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data.profile);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['.pdf', '.docx', '.doc'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError('Please upload a PDF or DOCX file.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.uploadCV(formData);
      setProfile(data.profile);
      setSuccess('CV parsed successfully! Your profile is ready.');
    } catch (err) {
      setError(err.message || 'Failed to parse CV. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleUpload(file);
  };

  const handleDelete = async () => {
    if (!confirm('Delete your profile? This cannot be undone.')) return;
    await api.deleteProfile();
    setProfile(null);
    setSuccess(null);
  };

  return (
    <div className="animate-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Upload your CV to build your AI candidate profile</p>
        </div>
        {profile && (
          <div className="flex gap-8">
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <RefreshCw size={16} /> Re-upload CV
            </button>
            <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--score-poor)' }}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          {success}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading profile...</span>
        </div>
      ) : !profile ? (
        /* UPLOAD ZONE */
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div className="loading-spinner" />
              <div style={{ fontWeight: 600 }}>Analyzing your CV with AI...</div>
              <div className="text-sm text-muted">This may take 10–20 seconds</div>
            </div>
          ) : (
            <>
              <div className="upload-icon">
                <Upload size={28} />
              </div>
              <div className="upload-title">Drop your CV here</div>
              <div className="upload-subtitle">or click to browse files</div>
              <div className="upload-formats">Supports PDF • DOCX • DOC — Max 10MB</div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files[0])}
          />
        </div>
      ) : (
        /* PROFILE DISPLAY */
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>

          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Identity Card */}
            <div className="card" style={{ textAlign: 'center', padding: 28 }}>
              <div style={{
                width: 72, height: 72,
                background: 'linear-gradient(135deg, var(--brand), #a78bfa)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 16px',
              }}>
                {profile.full_name?.charAt(0) || '?'}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{profile.full_name}</h2>
              {profile.location && <div className="text-sm text-muted" style={{ marginBottom: 4 }}>📍 {profile.location}</div>}
              {profile.email && <div className="text-sm text-secondary">{profile.email}</div>}
              {profile.phone && <div className="text-sm text-muted">{profile.phone}</div>}

              {profile.summary && (
                <p className="text-sm text-secondary" style={{ marginTop: 16, lineHeight: 1.7, textAlign: 'left' }}>
                  {profile.summary}
                </p>
              )}
            </div>

            {/* Skills Card */}
            <div className="card">
              <div className="profile-section-title">Primary Skills</div>
              <div className="flex flex-wrap gap-8">
                {profile.skills?.primary?.map(s => (
                  <span key={s} className="skill-tag primary">{s}</span>
                ))}
              </div>
              {profile.skills?.secondary?.length > 0 && (
                <>
                  <div className="profile-section-title" style={{ marginTop: 20 }}>Secondary Skills</div>
                  <div className="flex flex-wrap gap-8">
                    {profile.skills?.secondary?.map(s => (
                      <span key={s} className="skill-tag">{s}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Stats Card */}
            <div className="card">
              <div className="profile-section-title">At a Glance</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Total Experience</span>
                  <span className="text-sm font-bold text-brand">{profile.total_years_exp} years</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Target Roles</span>
                  <span className="text-sm font-semibold" style={{ textAlign: 'right', maxWidth: '55%', lineHeight: 1.4 }}>
                    {profile.target_roles?.join(', ')}
                  </span>
                </div>
                {profile.certifications?.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Certifications</span>
                    <span className="text-sm font-semibold">{profile.certifications.length}</span>
                  </div>
                )}
                {profile.languages?.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Languages</span>
                    <span className="text-sm font-semibold">{profile.languages.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Experience */}
            <div className="card">
              <div className="profile-section-title">Work Experience</div>
              {profile.experience?.length > 0 ? (
                profile.experience.map((exp, i) => (
                  <div key={i} className="experience-item">
                    <div className="experience-title">{exp.title}</div>
                    <div className="experience-company">{exp.company}</div>
                    <div className="experience-duration">{exp.duration}</div>
                    {exp.highlights?.length > 0 && (
                      <ul className="experience-highlights">
                        {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                      </ul>
                    )}
                  </div>
                ))
              ) : <div className="text-sm text-muted">No experience found in CV.</div>}
            </div>

            {/* Education */}
            <div className="card">
              <div className="profile-section-title">Education</div>
              {profile.education?.length > 0 ? (
                profile.education.map((edu, i) => (
                  <div key={i} className="experience-item">
                    <div className="experience-title">{edu.degree} {edu.field ? `— ${edu.field}` : ''}</div>
                    <div className="experience-company">{edu.institution}</div>
                    {edu.year && <div className="experience-duration">{edu.year}</div>}
                  </div>
                ))
              ) : <div className="text-sm text-muted">No education found in CV.</div>}
            </div>

            {/* Certifications */}
            {profile.certifications?.length > 0 && (
              <div className="card">
                <div className="profile-section-title">Certifications</div>
                <div className="flex flex-wrap gap-8">
                  {profile.certifications.map(cert => (
                    <span key={cert} className="skill-tag" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}>🏆 {cert}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for re-upload */}
      {profile && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files[0])}
        />
      )}
    </div>
  );
}

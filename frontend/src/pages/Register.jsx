import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, UserPlus, Check } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const passwordStrength = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strength = passwordStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'var(--score-poor)', 'var(--score-fair)', 'var(--score-good)', 'var(--score-excellent)'][strength];

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await register(form.email, form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card animate-in">
        <div className="auth-logo">
          <img src="/logo.png" alt="Chakrify" className="auth-logo-img" />
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start matching with your perfect job today</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <input id="reg-email" name="email" type="email" className="form-input"
              placeholder="you@example.com" value={form.email} onChange={handle} required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Display name</label>
            <input id="reg-username" name="username" type="text" className="form-input"
              placeholder="Your name" value={form.username} onChange={handle} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'}
                className="form-input" placeholder="Min. 8 characters"
                value={form.password} onChange={handle} required style={{ paddingRight: 44 }} />
              <button type="button" className="password-toggle"
                onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="password-strength-seg"
                      style={{ background: i <= strength ? strengthColor : 'var(--border)' }} />
                  ))}
                </div>
                <span style={{ color: strengthColor, fontSize: 12 }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
            <div style={{ position: 'relative' }}>
              <input id="reg-confirm" name="confirm" type={showPassword ? 'text' : 'password'}
                className="form-input" placeholder="Repeat your password"
                value={form.confirm} onChange={handle} required style={{ paddingRight: 44 }} />
              {form.confirm && form.password === form.confirm && (
                <div className="password-toggle" style={{ color: 'var(--score-excellent)' }}>
                  <Check size={16} />
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : <UserPlus size={18} />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

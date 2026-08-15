import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('chakrify_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('chakrify_token');
    if (!token) { setLoading(false); return; }
    api.getMe()
      .then(userData => { setUser(userData); localStorage.setItem('chakrify_user', JSON.stringify(userData)); })
      .catch(() => { localStorage.removeItem('chakrify_token'); localStorage.removeItem('chakrify_user'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // Listen for 401 events from api client
  useEffect(() => {
    const handler = () => { setUser(null); };
    window.addEventListener('chakrify:unauthorized', handler);
    return () => window.removeEventListener('chakrify:unauthorized', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('chakrify_token', data.access_token);
    localStorage.setItem('chakrify_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const data = await api.register(email, username, password);
    localStorage.setItem('chakrify_token', data.access_token);
    localStorage.setItem('chakrify_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('chakrify_token');
    localStorage.removeItem('chakrify_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

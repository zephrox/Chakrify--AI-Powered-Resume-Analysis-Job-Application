import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, Search, Settings, Briefcase, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/jobs', icon: Search, label: 'Job Search' },
  { to: '/cover-letters', icon: Briefcase, label: 'Cover Letters' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Chakrify" className="sidebar-logo-img" />
      </div>

      <div className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </div>

      {user && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="user-card">
            <div className="user-avatar">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user.username}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
          <button
            className="nav-link"
            style={{ width: '100%', marginTop: 4, color: 'var(--score-poor)' }}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}

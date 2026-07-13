import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { FaBell, FaMoon, FaSun, FaSignOutAlt, FaLinkedin, FaTwitter, FaEnvelope } from 'react-icons/fa';

const Header = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div className="container-fluid px-4">
        <Link to="/dashboard" className="navbar-brand mb-0 h4">
          🏗️ Construction CRM
        </Link>

        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={toggleDarkMode}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>

          <a href="mailto:support@constructioncrm.com" className="btn btn-outline-secondary btn-sm" title="Email support">
            <FaEnvelope />
          </a>

          <a href="https://www.linkedin.com/in/amit-kumar" target="_blank" rel="noreferrer" className="btn btn-outline-secondary btn-sm" title="LinkedIn">
            <FaLinkedin />
          </a>

          <a href="https://x.com/AmitKumar" target="_blank" rel="noreferrer" className="btn btn-outline-secondary btn-sm" title="Twitter">
            <FaTwitter />
          </a>

          <button type="button" className="btn btn-outline-secondary btn-sm position-relative">
            <FaBell />
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              3
            </span>
          </button>

          <div className="d-flex align-items-center gap-2 border rounded px-3 py-2">
            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 34, height: 34 }}>
              {initials.slice(0, 2)}
            </div>
            <div className="d-none d-sm-block">
              <div className="fw-semibold">{user?.name || 'User'}</div>
              <small className="text-muted">{user?.role || 'Guest'}</small>
            </div>
            <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={logout} title="Logout">
              <FaSignOutAlt />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
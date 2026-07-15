import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import {
  FaBell, FaMoon, FaSun, FaSignOutAlt, FaUserCircle, FaCog,
  FaInfoCircle, FaTimes, FaExclamationTriangle, FaClock, FaChevronDown
} from 'react-icons/fa';
import reminderService from '../../services/reminderService';

const Header = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'U';

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await reminderService.getReminders({ status: 'pending', limit: 8 });
      const list = res.data?.data || [];
      const sorted = [...list].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setNotifications(sorted);
    } catch (error) {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();
  const overdueCount = notifications.filter((n) => isOverdue(n.dueDate)).length;

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div className="container-fluid px-4">
        <Link to="/dashboard" className="navbar-brand mb-0 h4 d-flex align-items-center gap-2">
          🏗️ <span>BuildTrack <span className="text-primary">Pro</span></span>
        </Link>

        <div className="d-flex align-items-center gap-2">
          {/* <button>About us</button> */}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setAboutOpen(true)}
            title="About BuildTrack Pro"
          >
            <FaInfoCircle />
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>

          {/* Notifications */}
          <div className="position-relative" ref={notifRef}>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm position-relative"
              onClick={() => setNotifOpen((prev) => !prev)}
              title="Notifications"
            >
              <FaBell />
              {notifications.length > 0 && (
                <span
                  className={`position-absolute top-0 start-100 translate-middle badge rounded-pill ${overdueCount > 0 ? 'bg-danger' : 'bg-primary'}`}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                className="position-absolute end-0 mt-2 bg-white shadow rounded-3 border"
                style={{ width: '320px', zIndex: 1050, maxHeight: '400px', overflowY: 'auto' }}
              >
                <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                  <strong style={{ fontSize: '14px' }}>Notifications</strong>
                  <button className="btn btn-sm btn-link p-0 text-muted" onClick={() => setNotifOpen(false)}>
                    <FaTimes size={12} />
                  </button>
                </div>

                {notifLoading ? (
                  <div className="text-center text-muted py-4" style={{ fontSize: '13px' }}>Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="text-center text-muted py-4" style={{ fontSize: '13px' }}>
                    You're all caught up! 🎉
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => { setNotifOpen(false); navigate('/reminders'); }}
                      className="px-3 py-2 border-bottom"
                      style={{ cursor: 'pointer', fontSize: '13px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      <div className="d-flex align-items-start gap-2">
                        {isOverdue(n.dueDate) ? (
                          <FaExclamationTriangle size={12} color="#ef4444" style={{ marginTop: '3px', flexShrink: 0 }} />
                        ) : (
                          <FaClock size={12} color="#2563eb" style={{ marginTop: '3px', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{n.title}</div>
                          <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                            {n.client?.name || 'Unknown client'} · {new Date(n.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div className="text-center border-top py-2">
                  <Link
                    to="/reminders"
                    onClick={() => setNotifOpen(false)}
                    className="text-decoration-none"
                    style={{ fontSize: '13px' }}
                  >
                    View all reminders →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="position-relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="d-flex align-items-center gap-2 border rounded px-2 py-1 bg-white"
              style={{ cursor: 'pointer', border: '1px solid #e2e8f0' }}
            >
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                style={{ width: 34, height: 34, fontSize: '13px', fontWeight: 600 }}
              >
                {initials.slice(0, 2)}
              </div>
              <div className="d-none d-sm-block text-start">
                <div className="fw-semibold" style={{ fontSize: '13px', lineHeight: 1.1 }}>{user?.name || 'User'}</div>
                <small className="text-muted" style={{ fontSize: '11px', textTransform: 'capitalize' }}>{user?.role || 'Guest'}</small>
              </div>
              <FaChevronDown size={10} color="#94a3b8" />
            </button>

            {profileOpen && (
              <div
                className="position-absolute end-0 mt-2 bg-white shadow rounded-3 border"
                style={{ width: '200px', zIndex: 1050 }}
              >
                <button
                  onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                  className="btn btn-link text-decoration-none w-100 text-start d-flex align-items-center gap-2 px-3 py-2"
                  style={{ color: '#1e293b', fontSize: '14px' }}
                >
                  <FaUserCircle size={14} /> My Profile
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                  className="btn btn-link text-decoration-none w-100 text-start d-flex align-items-center gap-2 px-3 py-2"
                  style={{ color: '#1e293b', fontSize: '14px' }}
                >
                  <FaCog size={14} /> Settings
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="btn btn-link text-decoration-none w-100 text-start d-flex align-items-center gap-2 px-3 py-2 text-danger"
                  style={{ fontSize: '14px' }}
                >
                  <FaSignOutAlt size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* About Us Modal */}
      {aboutOpen && (
        <div
          onClick={() => setAboutOpen(false)}
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 2000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3 shadow p-4"
            style={{ maxWidth: '440px', width: '90%' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">About BuildTrack Pro</h5>
              <button className="btn btn-sm btn-link text-muted p-0" onClick={() => setAboutOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#475569' }}>
              🏗️ <strong>BuildTrack Pro</strong> is a CRM built for construction businesses to manage
              leads, track project stages, log client remarks, and stay on top of follow-ups — all in one place.
            </p>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span>Version</span><span>1.0.0</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span>Support</span>
                <a href="mailto:support@buildtrackpro.com" className="text-decoration-none">support@buildtrackpro.com</a>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span>© {new Date().getFullYear()}</span><span>BuildTrack Pro. All rights reserved.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
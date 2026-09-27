import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { toast } from 'react-toastify';
import {
  FaBell, FaMoon, FaSun, FaSignOutAlt, FaUserCircle, FaCog, FaCalendarCheck,
  FaInfoCircle, FaTimes, FaExclamationTriangle, FaClock, FaChevronDown
} from 'react-icons/fa';
import inAppNotificationService from '../../services/inAppNotificationService';
import reminderService from '../../services/reminderService';

const Header = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
      const res = await inAppNotificationService.getMyNotifications({ limit: 10 });
      const list = res.data || [];
      setNotifications(list);
      setUnreadCount(res.unreadCount !== undefined ? res.unreadCount : list.filter((n) => !n.isRead).length);
    } catch (error) {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await inAppNotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await inAppNotificationService.markAsRead(n._id);
        setNotifications((prev) => prev.map((item) => (item._id === n._id ? { ...item, isRead: true } : item)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
    setNotifOpen(false);

    if (n.type?.includes('site_visit') || n.targetType === 'SiteVisit') {
      navigate('/site-visits');
    } else if (n.type?.includes('attendance') || n.targetType === 'Attendance') {
      navigate(user?.role === 'manager' || user?.role === 'admin' ? '/manager/attendance' : '/attendance');
    } else if (n.type?.includes('lead') || n.targetType === 'Client') {
      navigate('/clients');
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh periodically
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

          {/* Notifications Dropdown */}
          <div className="position-relative" ref={notifRef}>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm position-relative"
              onClick={() => setNotifOpen((prev) => !prev)}
              title="Notifications"
            >
              <FaBell />
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                className="position-absolute end-0 mt-2 bg-white shadow rounded-3 border"
                style={{ width: '350px', zIndex: 1050, maxHeight: '420px', overflowY: 'auto' }}
              >
                <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                  <strong style={{ fontSize: '14px' }}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</strong>
                  <div className="d-flex align-items-center gap-2">
                    {unreadCount > 0 && (
                      <button className="btn btn-sm btn-link p-0 text-primary small text-decoration-none" onClick={handleMarkAllRead} style={{ fontSize: '11px' }}>
                        Mark all read
                      </button>
                    )}
                    <button className="btn btn-sm btn-link p-0 text-muted" onClick={() => setNotifOpen(false)}>
                      <FaTimes size={12} />
                    </button>
                  </div>
                </div>

                {notifLoading ? (
                  <div className="text-center text-muted py-4 small">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="text-center text-muted py-4" style={{ fontSize: '13px' }}>
                    You're all caught up! 🎉
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className="px-3 py-2 border-bottom"
                      style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        backgroundColor: n.isRead ? 'transparent' : '#f0f9ff',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = n.isRead ? 'white' : '#f0f9ff')}
                    >
                      <div className="d-flex align-items-start gap-2">
                        <FaClock size={12} color="#2563eb" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: n.isRead ? 400 : 600, color: '#1e293b' }}>{n.title}</div>
                          <div style={{ color: '#64748b', fontSize: '12px' }}>{n.message}</div>
                          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 5 }}></span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
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
                  onClick={() => { setProfileOpen(false); navigate('/attendance'); }}
                  className="btn btn-link text-decoration-none w-100 text-start d-flex align-items-center gap-2 px-3 py-2"
                  style={{ color: '#1e293b', fontSize: '14px' }}
                >
                  <FaCalendarCheck size={14} /> My Attendance
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
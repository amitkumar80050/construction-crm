import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  FaHome, FaUsers, FaComment, FaLayerGroup, FaBell,
  FaChartBar, FaUserCog, FaCog, FaFileImport, FaFileExport,
  FaThumbtack, FaHistory, FaWhatsapp, FaUserFriends,
  FaPhoneAlt, FaCompass, FaCalendarCheck, FaUserCheck, FaTachometerAlt, FaMapMarkerAlt, FaComments
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ pinned, onTogglePin }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isTelecaller = user?.role === 'telecaller';
  const isSalesExecutive = user?.role === 'sales executer';
  const isAuditor = user?.role === 'auditor';
  const isManagerOrAdmin = isAdmin || isManager;

  const navItems = isAuditor ? [
    { path: '/logs', icon: FaHistory, label: 'Activity Logs' },
  ] : [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/clients', icon: FaUsers, label: 'Leads' },
    ...(isTelecaller || isManagerOrAdmin ? [{ path: '/calling', icon: FaPhoneAlt, label: 'Calling Panel' }] : []),
    ...(isSalesExecutive || isManagerOrAdmin ? [{ path: '/site-visits', icon: FaCompass, label: isSalesExecutive ? 'My Site Visits' : 'Site Visits' }] : []),
    { path: '/attendance', icon: FaCalendarCheck, label: 'Attendance' },
    { path: '/remarks', icon: FaComment, label: 'Remarks' },
    { path: '/stages', icon: FaLayerGroup, label: 'Stages' },
    { path: '/reminders', icon: FaBell, label: 'Reminders' },
    { path: '/analytics', icon: FaChartBar, label: 'Analytics' },
    { path: '/whatsapp', icon: FaWhatsapp, label: 'WhatsApp' },
    { path: '/my-team', icon: FaUserFriends, label: 'My Team' },
    { path: '/logs', icon: FaHistory, label: isAdmin ? 'Activity Logs' : 'My Logs' },
  ];

  const managerItems = [
    { path: '/manager-dashboard', icon: FaTachometerAlt, label: 'Team Dashboard' },
    { path: '/manager/leads', icon: FaUsers, label: 'Team Leads' },
    { path: '/manager/team', icon: FaUserFriends, label: 'Team Members' },
    { path: '/manager/attendance', icon: FaUserCheck, label: 'Attendance Approvals' },
  ];

  const adminItems = [
    { path: '/users', icon: FaUserCog, label: 'Users' },
    { path: '/teams', icon: FaUserFriends, label: 'Teams' },
    { path: '/import', icon: FaFileImport, label: 'Import' },
    { path: '/export', icon: FaFileExport, label: 'Export' },
  ];

  return (
    <aside className={`sidebar ${pinned ? 'sidebar-pinned' : ''}`}>
      <div className="sidebar-brand">
        <h3 className="sidebar-brand-text">
          <span className="sidebar-brand-icon">🏗️</span>
          <span className="sidebar-brand-label">CRM</span>
        </h3>
        <button
          type="button"
          className={`sidebar-toggle-btn ${pinned ? 'active' : ''}`}
          onClick={onTogglePin}
          title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
          aria-label="Pin sidebar"
        >
          <FaThumbtack size={13} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <item.icon className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        {isManagerOrAdmin && (
          <>
            <div className="sidebar-divider">
              <span className="nav-label">Management</span>
            </div>
            {managerItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <div className="sidebar-divider">
              <span className="nav-label">Admin</span>
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {!isAuditor && (
          <NavLink to="/settings" className="nav-link">
            <FaCog className="nav-icon" />
            <span className="nav-label">Settings</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
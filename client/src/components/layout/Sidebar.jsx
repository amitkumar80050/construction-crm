import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  FaHome, FaUsers, FaComment, FaLayerGroup, FaBell,
  FaChartBar, FaUserCog, FaCog, FaFileImport, FaFileExport,
  FaThumbtack
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ pinned, onTogglePin }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/clients', icon: FaUsers, label: 'Leads' },
    { path: '/remarks', icon: FaComment, label: 'Remarks' },
    { path: '/stages', icon: FaLayerGroup, label: 'Stages' },
    { path: '/reminders', icon: FaBell, label: 'Reminders' },
    { path: '/analytics', icon: FaChartBar, label: 'Analytics' },
  ];

  const adminItems = [
    { path: '/users', icon: FaUserCog, label: 'Users' },
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

        <NavLink to="/settings" className="nav-link">
          <FaCog className="nav-icon" />
          <span className="nav-label">Settings</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
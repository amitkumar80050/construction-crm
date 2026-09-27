import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  FaHome, FaUsers, FaComment, FaLayerGroup, FaBell,
  FaChartBar, FaUserCog, FaCog, FaFileImport, FaFileExport,
  FaThumbtack, FaHistory, FaWhatsapp, FaUserFriends, FaMapMarkerAlt, FaClipboardCheck,
  FaComments
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ pinned, onTogglePin }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isTelecaller = user?.role === 'telecaller';
  const isSalesExecutive = user?.role === 'sales executer';
  const isAuditor = user?.role === 'auditor';

  const navItems = isAuditor ? [
    { path: '/logs', icon: FaHistory, label: 'Activity Logs' },
  ] : [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/clients', icon: FaUsers, label: 'Leads' },
    { path: '/remarks', icon: FaComment, label: 'Remarks' },
    { path: '/stages', icon: FaLayerGroup, label: 'Stages' },
    { path: '/reminders', icon: FaBell, label: 'Reminders' },
    { path: '/analytics', icon: FaChartBar, label: 'Analytics' },
    { path: '/whatsapp', icon: FaWhatsapp, label: 'WhatsApp' },
    { path: '/my-team', icon: FaUserFriends, label: 'My Team' },
    { path: '/my-team', icon: FaComments, label: 'Team Chat', badge: 3 },
    { path: '/logs', icon: FaHistory, label: isAdmin ? 'Activity Logs' : 'My Logs' },
    { path: '/attendance', icon: FaClipboardCheck, label: 'Attendance' },
  ];

  const managerItems = [
    { path: '/manager-dashboard', icon: FaChartBar, label: 'Manager dashboard' },
    { path: '/manager/team', icon: FaUsers, label: 'Team members' },
    { path: '/manager/attendance', icon: FaClipboardCheck, label: 'Attendance approvals' },
  ];

  const telecallerItems = [
    { path: '/dashboard', icon: FaUsers, label: 'My lead queue' },
  ];

  const salesExecutiveItems = [
    { path: '/site-visits', icon: FaMapMarkerAlt, label: 'My site visits' },
  ];

  const adminItems = [
    { path: '/users', icon: FaUserCog, label: 'Users' },
    { path: '/import', icon: FaFileImport, label: 'Import' },
    { path: '/export', icon: FaFileExport, label: 'Export' },
    { path: '/manager-dashboard', icon: FaChartBar, label: 'Team dashboard' },
    { path: '/manager/attendance', icon: FaClipboardCheck, label: 'Attendance approvals' },
    
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
            style={{ position: 'relative' }}
          >
            <item.icon className="nav-icon" />
            <span className="nav-label">{item.label}</span>
            {item.badge > 0 && (
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: 999,
                  fontSize: 10,
                  minWidth: 18,
                  height: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                  lineHeight: 1,
                }}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        {isManager && managerItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <item.icon className="nav-icon" /><span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        {isTelecaller && telecallerItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <item.icon className="nav-icon" /><span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        {isSalesExecutive && salesExecutiveItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <item.icon className="nav-icon" /><span className="nav-label">{item.label}</span>
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

        {!isAuditor && <NavLink to="/settings" className="nav-link">
          <FaCog className="nav-icon" />
          <span className="nav-label">Settings</span>
        </NavLink>}
      </nav>
    </aside>
  );
};

export default Sidebar;
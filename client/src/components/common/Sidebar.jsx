import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  FaHome, 
  FaUsers, 
  FaComment, 
  FaLayerGroup, 
  FaBell, 
  // FaPhone, 
  FaChartBar, 
  FaUserCog, 
  FaCog, 
  FaFileImport, 
  FaFileExport 
} from 'react-icons/fa';

const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/clients', icon: FaUsers, label: 'Leads' },
    { path: '/remarks', icon: FaComment, label: 'Remarks' },
    { path: '/stages', icon: FaLayerGroup, label: 'Stages' },
    { path: '/reminders', icon: FaBell, label: 'Reminders' },
    // { path: '/calling', icon: FaPhone, label: 'Calling' },
    { path: '/analytics', icon: FaChartBar, label: 'Analytics' },
  ];

  const adminItems = [
    { path: '/users', icon: FaUserCog, label: 'Users' },
    { path: '/import', icon: FaFileImport, label: 'Import' },
    { path: '/export', icon: FaFileExport, label: 'Export' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h3>🏗️ CRM</h3>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        {isAdmin && (
          <>
            <div className="sidebar-divider">Admin</div>
            {adminItems.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path} 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
        
        <NavLink to="/settings" className="nav-link">
          <FaCog />
          <span>Settings</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
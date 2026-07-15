import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FaHome, FaUsers, FaComment, FaBell, FaPhone, FaUser, FaCog, FaSignOutAlt, FaFileExport } from 'react-icons/fa';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

const UserLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/clients', icon: FaUsers, label: 'Leads' },
    { path: '/remarks', icon: FaComment, label: 'Remarks' },
    { path: '/reminders', icon: FaBell, label: 'Reminders' },
    // { path: '/calling', icon: FaPhone, label: 'Calling' },
    { path: '/export', icon: FaFileExport, label: 'Export Data' },  
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        background: '#0f172a', 
        color: 'white', 
        padding: '20px',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏗️ CRM
          </h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>User Panel</p>
        </div>

        <nav>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                marginBottom: '4px',
                borderRadius: '8px',
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e293b';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <Link
            to="/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '8px',
              color: '#94a3b8',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
          >
            <FaUser size={18} />
            <span>Profile</span>
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '8px',
              color: '#94a3b8',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s'
            }}
          >
            <FaSignOutAlt size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div style={{ marginLeft: '250px', flex: 1, minHeight: '100vh' }} className="d-flex flex-column">
        <Header />
        <main className="flex-grow-1 bg-light p-4">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default UserLayout;
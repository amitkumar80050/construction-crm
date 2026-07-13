import React from 'react';
import { useAuth } from '../hooks/useAuth';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '24px' }}>Profile</h1>
      
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#2563eb',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 'bold'
          }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 style={{ color: '#1e293b' }}>{user?.name || 'User'}</h2>
            <p style={{ color: '#64748b' }}>{user?.role || 'User'}</p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontWeight: '500', color: '#64748b', fontSize: '14px' }}>Email</label>
              <p style={{ color: '#1e293b' }}>{user?.email || 'user@example.com'}</p>
            </div>
            <div>
              <label style={{ fontWeight: '500', color: '#64748b', fontSize: '14px' }}>Phone</label>
              <p style={{ color: '#1e293b' }}>{user?.phone || 'Not provided'}</p>
            </div>
            <div>
              <label style={{ fontWeight: '500', color: '#64748b', fontSize: '14px' }}>Department</label>
              <p style={{ color: '#1e293b' }}>{user?.department || 'Not assigned'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Profile;
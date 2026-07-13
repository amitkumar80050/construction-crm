import React from 'react';

const Users = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Users Management</h1>
      <p style={{ color: '#64748b' }}>Manage system users (Admin only)</p>
      
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginTop: '20px'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Role</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>Admin User</td>
                <td style={{ padding: '12px' }}>admin@example.com</td>
                <td style={{ padding: '12px' }}>Admin</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#dcfce7', color: '#22c55e' }}>
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
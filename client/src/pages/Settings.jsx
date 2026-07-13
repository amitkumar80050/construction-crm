import React from 'react';

const Settings = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '24px' }}>Settings</h1>
      
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#1e293b', marginBottom: '12px' }}>Application Settings</h3>
          <p style={{ color: '#64748b' }}>Configure your application preferences</p>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontWeight: '500', color: '#1e293b' }}>Dark Mode</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Toggle dark theme</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#ccc',
                transition: '.4s',
                borderRadius: '24px'
              }}></span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontWeight: '500', color: '#1e293b' }}>Notifications</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Receive email notifications</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#22c55e',
                transition: '.4s',
                borderRadius: '24px'
              }}></span>
            </label>
          </div>
        </div>

        <button style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}>
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
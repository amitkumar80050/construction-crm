import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const oauthError = searchParams.get('error');

    const errorMessages = {
        not_registered: 'This Google account is not registered for this CRM. Please contact the administrator.',
        inactive: 'Your account is inactive. Please contact the administrator.',
        google_mismatch: 'This Google account cannot be used to sign in. Please contact the administrator.',
        google_failed: 'Google sign-in failed. Please try again.',
      };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else if (result.requiresVerification) {
      navigate(`/verify-user?userId=${encodeURIComponent(result.userId)}`);
    }
  };

  return (
    <div style={{
      background: 'white',
      padding: '36px',
      borderRadius: '16px',
      boxShadow: '0 20px 40px -15px rgba(15,23,42,0.15), 0 0 0 1px rgba(15,23,42,0.05)',
      maxWidth: '460px',
      width: '100%'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '32px', marginBottom: '4px' }}>🏗️</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          BuildTrack <span style={{ color: '#2563eb' }}>Pro</span> CRM
        </h1>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
          Enterprise Construction Multi-Role CRM & Field Operations
        </p>
      </div>

      {oauthError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
          {errorMessages[oauthError] || 'Login failed. Please try again.'}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1e293b' }}>
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1e293b' }}>
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600',
            cursor: 'pointer', transition: 'background 0.3s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
        >
          {loading ? 'Signing in...' : 'LogIn'}
        </button>

        
      </form>
    </div>
  );
};

export default Login;
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaGoogle, FaGithub, FaLinkedin } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: 'admin@example.com',
    password: 'password123',
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

  const oauthBtnStyle = (bg) => ({
    width: '100%',
    padding: '10px',
    background: bg,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '10px'
  });

  return (
    <div style={{
      background: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      maxWidth: '420px',
      width: '100%'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', color: '#1e293b' }}>🏗️ BuildTrack Pro CRM</h1>
        <p style={{ color: '#64748b', marginTop: '8px' }}>Log in to your account</p>
      </div>

      {oauthError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
          {errorMessages[oauthError] || 'LogIn failed. Please try again.'}
        </div>
      )}

    
      
      {/* OAuth buttons */}
      <div style={{ marginBottom: '20px' }}>
        <a href={`${API_BASE}/auth/google`} style={{ textDecoration: 'none' }}>
          <button type="button" style={oauthBtnStyle('#DB4437')}>
            <FaGoogle /> Continue with Google
          </button>
        </a>
        
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', color: '#94a3b8', fontSize: '12px' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        OR LOG IN WITH EMAIL
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>

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
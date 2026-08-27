import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGoogle, FaGithub, FaLinkedin } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(formData);
    setLoading(false);
    if (result.success) {
      navigate('/login');
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
        <p style={{ color: '#64748b', marginTop: '8px' }}>Create your account</p>
      </div>

      {/* OAuth buttons — new accounts auto-generate a userId (CRM-side), same as email signup */}
      <div style={{ marginBottom: '20px' }}>
        <a href={`${API_BASE}/auth/google`} style={{ textDecoration: 'none' }}>
          <button type="button" style={oauthBtnStyle('#DB4437')}>
            <FaGoogle /> Sign up with Google
          </button>
        </a>
        <a href={`${API_BASE}/auth/github`} style={{ textDecoration: 'none' }}>
          <button type="button" style={oauthBtnStyle('#24292e')}>
            <FaGithub /> Sign up with GitHub
          </button>
        </a>
        <a href={`${API_BASE}/auth/linkedin`} style={{ textDecoration: 'none' }}>
          <button type="button" style={oauthBtnStyle('#0A66C2')}>
            <FaLinkedin /> Sign up with LinkedIn
          </button>
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', color: '#94a3b8', fontSize: '12px' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        OR SIGN UP WITH EMAIL
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1e293b' }}>Full Name</label>
          <input
            type="text" name="name" value={formData.name} onChange={handleChange}
            placeholder="Enter your full name" required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1e293b' }}>Email Address</label>
          <input
            type="email" name="email" value={formData.email} onChange={handleChange}
            placeholder="Enter your email" required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1e293b' }}>Password</label>
          <input
            type="password" name="password" value={formData.password} onChange={handleChange}
            placeholder="Enter your password (min 6 characters)" required minLength="6"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1e293b' }}>Phone Number</label>
          <input
            type="tel" name="phone" value={formData.phone} onChange={handleChange}
            placeholder="Enter your phone number" required
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
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#64748b' }}>
          <p>Already have an account? <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>Sign In</Link></p>
        </div>
      </form>
    </div>
  );
};

export default Signup;
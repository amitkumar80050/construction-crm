import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: 'admin@example.com',
    password: 'password123',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{
      background: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', color: '#1e293b' }}>🏗️ Construction CRM</h1>
        <p style={{ color: '#64748b', marginTop: '8px' }}>Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
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
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.3s'
            }}
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
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.3s'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#64748b' }}>
          <p>
            Don't have an account? <Link to="/signup" style={{ color: '#2563eb', textDecoration: 'none' }}>Sign Up</Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
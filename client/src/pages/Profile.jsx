import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaEnvelope, FaPhone, FaBuilding, FaEdit, FaSave, FaTimes,
  FaLock, FaShieldAlt, FaCalendarAlt, FaClock, FaUserCog, FaIdBadge
} from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';

const DEPARTMENTS = ['sales', 'marketing', 'operations', 'management'];

const Profile = () => {
  const { user, setUser } = useAuth(); // assumes useAuth exposes setUser; see note below
  const isAdmin = user?.role === 'admin';

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || 'sales'
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleEditToggle = () => {
    if (!editing) {
      setForm({ name: user?.name || '', phone: user?.phone || '', department: user?.department || 'sales' });
    }
    setEditing(!editing);
  };

  const handleSaveProfile = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setSaving(true);
    try {
      const res = await authService.updateProfile(form);
      const updatedUser = res.data?.user;
      if (updatedUser && setUser) {
        setUser(updatedUser);
      }
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully!');
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to change password';
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px'
  };
  const labelStyle = { fontWeight: '500', color: '#64748b', fontSize: '13px', display: 'block', marginBottom: '4px' };

  return (
    <div style={{ padding: '24px', display: 'grid', gap: '24px', maxWidth: '760px' }}>
      <div>
        <h1 style={{ fontSize: '28px', color: '#1e293b', margin: 0 }}>Profile</h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>Manage your account information</p>
      </div>

      {/* Header card */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: isAdmin ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : '#2563eb',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ color: '#1e293b', margin: 0 }}>{user?.name || 'User'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: isAdmin ? '#ede9fe' : '#dbeafe',
                  color: isAdmin ? '#7c3aed' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {isAdmin ? <FaShieldAlt size={11} /> : <FaUserCog size={11} />}
                  {isAdmin ? 'Administrator' : 'Team Member'}
                </span>
                {user?.userId && (
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                    background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <FaIdBadge size={11} /> {user.userId}
                  </span>
                )}
                {user?.isActive !== undefined && (
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                    background: user.isActive ? '#dcfce7' : '#fee2e2',
                    color: user.isActive ? '#16a34a' : '#dc2626'
                  }}>
                    {user.isActive ? 'Active' : 'Disabled'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!editing ? (
            <button
              onClick={handleEditToggle}
              style={{
                padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <FaEdit size={13} /> Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleEditToggle}
                style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaTimes size={12} /> Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                style={{
                  padding: '10px 16px', background: saving ? '#93c5fd' : '#22c55e', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <FaSave size={12} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details card */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#1e293b', marginBottom: '18px', fontSize: '16px' }}>Contact Information</h3>

        {!editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <p style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaEnvelope size={12} color="#16a34a" /> {user?.email || '—'}
              </p>
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <p style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaPhone size={12} color="#dc2626" /> {user?.phone || 'Not provided'}
              </p>
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <p style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize' }}>
                <FaBuilding size={12} color="#2563eb" /> {user?.department || 'Not assigned'}
              </p>
            </div>
            <div>
              <label style={labelStyle}>Member Since</label>
              <p style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCalendarAlt size={12} color="#8b5cf6" />
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
            {user?.lastLogin && (
              <div>
                <label style={labelStyle}>Last Login</label>
                <p style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaClock size={12} color="#f59e0b" /> {new Date(user.lastLogin).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email (read-only)</label>
              <input type="email" value={user?.email || ''} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }} />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                style={inputStyle}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Security card */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPasswordForm ? '18px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaLock color="#2563eb" />
            <h3 style={{ color: '#1e293b', margin: 0, fontSize: '16px' }}>Security</h3>
          </div>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
            >
              Change Password
            </button>
          )}
        </div>

        {showPasswordForm && (
          <div style={{ display: 'grid', gap: '14px', maxWidth: '400px' }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                style={{
                  padding: '8px 16px', background: changingPassword ? '#93c5fd' : '#2563eb', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: changingPassword ? 'not-allowed' : 'pointer'
                }}
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin-only section */}
      {isAdmin && (
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #ede9fe'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <FaShieldAlt color="#7c3aed" />
            <h3 style={{ color: '#1e293b', margin: 0, fontSize: '16px' }}>Administrator Access</h3>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '14px' }}>
            You have full access to manage users, view team performance, and configure system-wide settings.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href="/users" style={{
              padding: '8px 16px', background: '#ede9fe', color: '#7c3aed', borderRadius: '8px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500
            }}>
              Manage Users
            </a>
            <a href="/analytics" style={{
              padding: '8px 16px', background: '#dbeafe', color: '#2563eb', borderRadius: '8px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500
            }}>
              View Team Analytics
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
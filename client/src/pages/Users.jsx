import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FaUserPlus, FaSearch, FaEdit, FaTrash, FaUndo, FaKey,
  FaUserShield, FaShieldAlt, FaSort, FaSortUp, FaSortDown, FaBan
} from 'react-icons/fa';
import userService from '../services/userService';
import { useAuth } from '../hooks/useAuth';

const ROLES = ['admin', 'manager', 'telecaller','sales executer'];
const DEPARTMENTS = ['sales', 'marketing', 'operations', 'management'];
const PERMISSIONS = [
  'manage_leads', 'manage_remarks', 'manage_stages',
  'manage_reminders', 'manage_users', 'view_analytics',
  'import_data', 'export_data',
];

const emptyCreateForm = {
  name: '', email: '', password: '', phone: '', role: 'telecaller', department: 'sales'
};

const Users = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Filters / search / sort / pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', department: 'sales' });
  const [saving, setSaving] = useState(false);

  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  const [permModalUser, setPermModalUser] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, sortBy, sortOrder };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (showDeleted) params.deletedOnly = 'true';

      const res = await userService.getUsers(params);
      setUsers(res.data?.data || []);
      setTotal(res.data?.total || 0);
      setPages(res.data?.pages || 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, search, roleFilter, statusFilter, showDeleted]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const sortIcon = (field) => {
    if (sortBy !== field) return <FaSort size={11} color="#cbd5e1" />;
    return sortOrder === 'asc' ? <FaSortUp size={11} /> : <FaSortDown size={11} />;
  };

  // --- Create ---
 const handleCreateUser = async () => {
  if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password || !createForm.phone.trim()) {
    toast.error('Please fill in all required fields');
    return;
  }
  setCreating(true);
  try {
    const res = await userService.createUser(createForm);
    const { data, message } = res.data;
    toast.success(message);
    toast.info(`User ID: ${data.userId} | Email: ${data.email} | Status: Pending Verification`, { autoClose: 8000 });
    setShowCreateModal(false);
    setCreateForm(emptyCreateForm);
    fetchUsers();
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Unable to create user');
  } finally {
    setCreating(false);
  }
};

  // --- Edit ---
  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email, phone: user.phone, department: user.department });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await userService.updateUser(editingUser._id, editForm);
      toast.success('User updated successfully!');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update user');
    } finally {
      setSaving(false);
    }
  };

  // --- Soft delete / restore ---
  const handleSoftDelete = async (user) => {
    if (!window.confirm(`Deactivate and soft-delete ${user.name}? They can be restored later.`)) return;
    try {
      await userService.softDeleteUser(user._id);
      toast.success('User deleted (soft) successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to delete user');
    }
  };

  const handleRestore = async (user) => {
    try {
      await userService.restoreUser(user._id);
      toast.success('User restored successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to restore user');
    }
  };

  const handlePermanentDelete = async (user) => {
    if (!window.confirm(`Permanently delete ${user.name}? This CANNOT be undone.`)) return;
    try {
      await userService.permanentlyDeleteUser(user._id);
      toast.success('User permanently deleted');
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to delete user');
    }
  };

  // --- Reset password ---
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setResettingPassword(true);
    try {
      await userService.resetUserPassword(passwordModalUser._id, newPassword);
      toast.success('Password reset successfully');
      setPasswordModalUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  // --- Role ---
  const openRoleModal = (user) => {
    setRoleModalUser(user);
    setSelectedRole(user.role);
  };

  const handleSaveRole = async () => {
    setSavingRole(true);
    try {
      await userService.assignRole(roleModalUser._id, selectedRole);
      toast.success('Role updated successfully');
      setRoleModalUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update role');
    } finally {
      setSavingRole(false);
    }
  };

  // --- Permissions ---
  const openPermModal = (user) => {
    setPermModalUser(user);
    setSelectedPerms(user.permissions || []);
  };

  const togglePerm = (perm) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSavePerms = async () => {
    setSavingPerms(true);
    try {
      await userService.assignPermissions(permModalUser._id, selectedPerms);
      toast.success('Permissions updated successfully');
      setPermModalUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' };
  const modalOverlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
  };
  const modalBox = { background: 'white', padding: '28px', borderRadius: '12px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto' };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Users Management</h1>
          <p style={{ color: '#64748b' }}>Manage system users, roles, and permissions (Admin only)</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaUserPlus /> Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '8px 14px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: '200px' }}>
          <FaSearch style={{ color: '#64748b', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search name, email, user ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ border: 'none', outline: 'none', flex: 1, padding: '6px 0', fontSize: '14px' }}
          />
        </div>

        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
          <option value="all">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
          <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }} />
          Show deleted only
        </label>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th onClick={() => handleSort('name')} style={{ padding: '14px', textAlign: 'left', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Name {sortIcon('name')}</span>
                </th>
                <th onClick={() => handleSort('email')} style={{ padding: '14px', textAlign: 'left', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Email {sortIcon('email')}</span>
                </th>
                <th style={{ padding: '14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>Role</th>
                <th style={{ padding: '14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>Department</th>
                <th style={{ padding: '14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>Status</th>
                <th style={{ padding: '14px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} style={{ borderBottom: '1px solid #e2e8f0', opacity: u.isDeleted ? 0.6 : 1 }}>
                    <td style={{ padding: '14px', fontWeight: 500, color: '#1e293b' }}>
                      {u.name}
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>{u.userId}</div>
                    </td>
                    <td style={{ padding: '14px', color: '#475569' }}>{u.email}</td>
                    <td style={{ padding: '14px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', textTransform: 'capitalize',
                        background: u.role === 'admin' ? '#ede9fe' : u.role === 'manager' ? '#dbeafe' : '#f1f5f9',
                        color: u.role === 'admin' ? '#7c3aed' : u.role === 'manager' ? '#2563eb' : '#64748b'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px', color: '#64748b', textTransform: 'capitalize' }}>{u.department}</td>
                    <td style={{ padding: '14px' }}>
                      {u.isDeleted ? (
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#f1f5f9', color: '#64748b' }}>Deleted</span>
                      ) : u.status === 'PENDING_VERIFICATION' ? (
                          <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#fef3c7', color: '#d97706' }}>Pending Verification</span>
                        ) :(
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                          background: u.isActive ? '#dcfce7' : '#fee2e2',
                          color: u.isActive ? '#22c55e' : '#dc2626'
                        }}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {u.isDeleted ? (
                          <>
                            <button onClick={() => handleRestore(u)} title="Restore" style={actionBtn('#dcfce7', '#16a34a')}><FaUndo size={11} /></button>
                            <button onClick={() => handlePermanentDelete(u)} title="Permanently delete" style={actionBtn('#fee2e2', '#dc2626')}><FaBan size={11} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openEdit(u)} title="Edit" style={actionBtn('#dbeafe', '#2563eb')}><FaEdit size={11} /></button>
                            <button onClick={() => openRoleModal(u)} title="Assign role" style={actionBtn('#ede9fe', '#7c3aed')}><FaUserShield size={11} /></button>
                            <button onClick={() => openPermModal(u)} title="Assign permissions" style={actionBtn('#fef3c7', '#d97706')}><FaShieldAlt size={11} /></button>
                            <button onClick={() => setPasswordModalUser(u)} title="Reset password" style={actionBtn('#e0e7ff', '#4f46e5')}><FaKey size={11} /></button>
                            <button
                              onClick={() => handleSoftDelete(u)}
                              disabled={u._id === currentUser?.id}
                              title={u._id === currentUser?.id ? "Can't delete yourself" : 'Delete'}
                              style={{ ...actionBtn('#fee2e2', '#dc2626'), opacity: u._id === currentUser?.id ? 0.4 : 1, cursor: u._id === currentUser?.id ? 'not-allowed' : 'pointer' }}
                            >
                              <FaTrash size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pagerBtn(page === 1)}>Previous</button>
          <span style={{ color: '#64748b', fontSize: '14px' }}>Page {page} of {pages} ({total} users)</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} style={pagerBtn(page === pages)}>Next</button>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Add New User</h2>
            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password *</label>
                <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Role</label>
                  <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} style={inputStyle}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Department</label>
                  <select value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} style={inputStyle}>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowCreateModal(false); setCreateForm(emptyCreateForm); }} style={cancelBtn}>Cancel</button>
              <button onClick={handleCreateUser} disabled={creating} style={primaryBtn(creating)}>{creating ? 'Creating...' : 'Create User'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Edit User</h2>
            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <select value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} style={inputStyle}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingUser(null)} style={cancelBtn}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} style={primaryBtn(saving)}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordModalUser && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h2 style={{ marginBottom: '8px', color: '#1e293b' }}>Reset Password</h2>
            <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>For: <strong>{passwordModalUser.name}</strong></p>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="Min 6 characters" />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setPasswordModalUser(null); setNewPassword(''); }} style={cancelBtn}>Cancel</button>
              <button onClick={handleResetPassword} disabled={resettingPassword} style={primaryBtn(resettingPassword)}>{resettingPassword ? 'Resetting...' : 'Reset Password'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {roleModalUser && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h2 style={{ marginBottom: '8px', color: '#1e293b' }}>Assign Role</h2>
            <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>For: <strong>{roleModalUser.name}</strong></p>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Role</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={inputStyle}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRoleModalUser(null)} style={cancelBtn}>Cancel</button>
              <button onClick={handleSaveRole} disabled={savingRole} style={primaryBtn(savingRole)}>{savingRole ? 'Saving...' : 'Save Role'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Permissions Modal */}
      {permModalUser && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h2 style={{ marginBottom: '8px', color: '#1e293b' }}>Assign Permissions</h2>
            <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>For: <strong>{permModalUser.name}</strong></p>
            <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
              {PERMISSIONS.map((perm) => (
                <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedPerms.includes(perm)} onChange={() => togglePerm(perm)} />
                  <span style={{ fontSize: '13px', color: '#1e293b', textTransform: 'capitalize' }}>{perm.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPermModalUser(null)} style={cancelBtn}>Cancel</button>
              <button onClick={handleSavePerms} disabled={savingPerms} style={primaryBtn(savingPerms)}>{savingPerms ? 'Saving...' : 'Save Permissions'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const actionBtn = (bg, color) => ({
  padding: '6px 10px', background: bg, color, border: 'none', borderRadius: '6px', cursor: 'pointer'
});
const cancelBtn = { padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' };
const primaryBtn = (busy) => ({
  padding: '10px 20px', background: busy ? '#93c5fd' : '#2563eb', color: 'white',
  border: 'none', borderRadius: '8px', cursor: busy ? 'not-allowed' : 'pointer'
});
const pagerBtn = (disabled) => ({
  padding: '8px 16px', background: disabled ? '#f1f5f9' : 'white', color: disabled ? '#cbd5e1' : '#1e293b',
  border: '1px solid #e2e8f0', borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer'
});

export default Users;
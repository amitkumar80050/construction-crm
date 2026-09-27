import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const ManagerTeam = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });

  const fetch = () => {
    setLoading(true);
    api.get('/auth/users').then((res) => setMembers(res.data.data))
      .catch(() => toast.error('Unable to load team'))
      .finally(() => setLoading(false));
  };
  useEffect(fetch, []);

  const openEdit = (m) => { setEditing(m); setForm({ name: m.name, phone: m.phone, isActive: m.isActive }); };

  const save = async () => {
    try {
      await api.put(`/auth/users/${editing._id}`, form);
      toast.success('Updated');
      setEditing(null);
      fetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', color: '#1e293b' }}>My Team</h1>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', marginTop: '16px', background: 'white', borderCollapse: 'collapse', borderRadius: '12px', overflow: 'hidden' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Phone</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px' }}>Actions</th>
          </tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px' }}>{m.name}</td>
                <td style={{ padding: '10px', textTransform: 'capitalize' }}>{m.role}</td>
                <td style={{ padding: '10px' }}>{m.phone}</td>
                <td style={{ padding: '10px' }}>{m.isActive ? 'Active' : 'Inactive'}</td>
                <td style={{ padding: '10px' }}><button onClick={() => openEdit(m)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '320px' }}>
            <h3>Edit {editing.name}</h3>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px', margin: '8px 0' }} />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '8px', margin: '8px 0' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 16px' }}>
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)}>Cancel</button>
              <button onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ManagerTeam;
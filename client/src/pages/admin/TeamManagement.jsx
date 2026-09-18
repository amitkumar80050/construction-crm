import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaUsers, FaUserTie, FaTrash, FaEdit, FaArchive } from 'react-icons/fa';
import teamService from '../../services/teamService';
import userService from '../../services/userService';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', department: 'sales', description: '', teamLead: '' });
  const [creating, setCreating] = useState(false);

  const [manageTeam, setManageTeam] = useState(null);
  const [addMemberId, setAddMemberId] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, usersRes] = await Promise.all([
        teamService.getTeams(),
        userService.getUsers({ limit: 200 }),
      ]);
      setTeams(teamsRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } catch (error) {
      toast.error('Unable to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      toast.error('Team name and code are required');
      return;
    }
    setCreating(true);
    try {
      await teamService.createTeam(createForm);
      toast.success('Team created');
      setShowCreate(false);
      setCreateForm({ name: '', code: '', department: 'sales', description: '', teamLead: '' });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (teamId) => {
    if (!window.confirm('Archive this team?')) return;
    try {
      await teamService.deleteTeam(teamId);
      toast.success('Team archived');
      fetchAll();
    } catch (error) {
      toast.error('Unable to archive team');
    }
  };

  const openManage = async (team) => {
    const res = await teamService.getTeam(team._id);
    setManageTeam(res.data.data);
  };

  const handleAddMember = async () => {
    if (!addMemberId) return;
    try {
      await teamService.addMember(manageTeam._id, addMemberId);
      toast.success('Member added');
      const res = await teamService.getTeam(manageTeam._id);
      setManageTeam(res.data.data);
      setAddMemberId('');
      fetchAll();
    } catch (error) {
      toast.error('Unable to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await teamService.removeMember(manageTeam._id, userId);
      toast.success('Member removed');
      const res = await teamService.getTeam(manageTeam._id);
      setManageTeam(res.data.data);
      fetchAll();
    } catch (error) {
      toast.error('Unable to remove member');
    }
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#1e293b' }}>Team Management</h1>
        <button onClick={() => setShowCreate(true)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Create Team
        </button>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Team Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Code</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Team Lead</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Members</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
            </tr></thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '12px' }}>{t.code}</td>
                  <td style={{ padding: '12px' }}>{t.teamLead?.name || '—'}</td>
                  <td style={{ padding: '12px' }}>{t.memberCount}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', background: t.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9', color: t.status === 'ACTIVE' ? '#22c55e' : '#64748b' }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => openManage(t)} title="Manage members" style={{ background: '#dbeafe', color: '#2563eb', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><FaUsers size={12} /></button>
                    <button onClick={() => handleArchive(t._id)} title="Archive" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><FaArchive size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Team modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Create Team</h3>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <div><label style={labelStyle}>Team Name *</label><input style={inputStyle} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></div>
              <div><label style={labelStyle}>Team Code *</label><input style={inputStyle} placeholder="TEAM-LKO" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} /></div>
              <div><label style={labelStyle}>Department</label><input style={inputStyle} value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} /></div>
              <div>
                <label style={labelStyle}>Team Lead</label>
                <select style={inputStyle} value={createForm.teamLead} onChange={(e) => setCreateForm({ ...createForm, teamLead: e.target.value })}>
                  <option value="">Select...</option>
                  {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{creating ? 'Creating...' : 'Create Team'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage members modal */}
      {manageTeam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaUserTie /> {manageTeam.name}</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Team Lead: {manageTeam.teamLead?.name || '—'}</p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <select style={{ ...inputStyle, flex: 1 }} value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)}>
                <option value="">Add user...</option>
                {users.filter((u) => !manageTeam.members.some((m) => m._id === u._id)).map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
              <button onClick={handleAddMember} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add</button>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {manageTeam.members.map((m) => (
                <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>{m.name} <span style={{ color: '#94a3b8', fontSize: '12px' }}>({m.userId})</span></span>
                  <button onClick={() => handleRemoveMember(m._id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><FaTrash size={12} /></button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setManageTeam(null)} style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
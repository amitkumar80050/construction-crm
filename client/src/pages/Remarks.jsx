import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaUser, FaCalendar, FaTrash, FaComment } from 'react-icons/fa';
import remarkService from '../services/remarkService';
import clientService from '../services/clientService';

const getTypeColor = (type) => {
  switch (type) {
    case 'call': return '#2563eb';
    case 'meeting': return '#8b5cf6';
    case 'email': return '#0ea5e9';
    case 'follow-up': return '#f59e0b';
    case 'note': return '#22c55e';
    default: return '#64748b';
  }
};

const getVisibilityBadge = (visibility) => {
  const colors = { public: '#22c55e', team: '#8b5cf6', private: '#ef4444' };
  const c = colors[visibility] || '#64748b';
  return { background: `${c}20`, color: c };
};

const Remarks = () => {
  const navigate = useNavigate();
  const [remarks, setRemarks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRemark, setNewRemark] = useState({
    client: '',
    content: '',
    type: 'note',
    visibility: 'public'
  });

  const fetchRemarks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType !== 'all') params.type = filterType;

      const res = await remarkService.getAllRemarks(params);
      setRemarks(res.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load remarks';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await clientService.getClients({ limit: 100 });
      setClients(res.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchRemarks();
  }, [fetchRemarks]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleAddRemark = async () => {
    if (!newRemark.client || !newRemark.content.trim()) {
      toast.error('Please select a client and enter remark content');
      return;
    }

    setSaving(true);
    try {
      await remarkService.createRemark({
        client: newRemark.client,
        content: newRemark.content.trim(),
        type: newRemark.type,
        visibility: newRemark.visibility
      });

      toast.success('Remark added successfully!');
      setShowAddModal(false);
      setNewRemark({ client: '', content: '', type: 'note', visibility: 'public' });
      fetchRemarks();
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to add remark';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRemark = async (id) => {
    if (!window.confirm('Are you sure you want to delete this remark?')) return;
    try {
      await remarkService.deleteRemark(id);
      setRemarks((prev) => prev.filter((r) => r._id !== id));
      toast.success('Remark deleted successfully!');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete remark';
      toast.error(message);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Remarks & Notes</h1>
          <p style={{ color: '#64748b' }}>Track all client interactions and notes</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 20px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <FaPlus /> Add Remark
        </button>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '24px' }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
            background: 'white', fontSize: '14px', cursor: 'pointer'
          }}
        >
          <option value="all">All Types</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="email">Email</option>
          <option value="note">Note</option>
          <option value="follow-up">Follow-up</option>
        </select>
      </div>

      {/* Remarks List */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Loading remarks...</p>
      ) : remarks.length === 0 ? (
        <div style={{
          background: 'white', padding: '40px', borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', color: '#94a3b8'
        }}>
          <FaComment size={32} style={{ marginBottom: '10px' }} />
          <p>No remarks found. Click "Add Remark" to create one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {remarks.map((remark) => (
            <div
              key={remark._id}
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: `4px solid ${getTypeColor(remark.type)}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <strong
                      onClick={() => remark.client?._id && navigate(`/clients/${remark.client._id}`)}
                      style={{ color: '#1e293b', fontSize: '16px', cursor: remark.client?._id ? 'pointer' : 'default' }}
                    >
                      {remark.client?.name || 'Unknown client'}
                    </strong>
                    {remark.client?.company && (
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>{remark.client.company}</span>
                    )}
                    <span style={{
                      padding: '2px 12px', borderRadius: '20px', fontSize: '12px',
                      background: `${getTypeColor(remark.type)}20`, color: getTypeColor(remark.type)
                    }}>
                      {remark.type}
                    </span>
                    <span style={{
                      padding: '2px 12px', borderRadius: '20px', fontSize: '12px',
                      ...getVisibilityBadge(remark.visibility)
                    }}>
                      {remark.visibility}
                    </span>
                  </div>

                  <p style={{ color: '#475569', marginBottom: '12px' }}>{remark.content}</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaUser size={12} /> {remark.user?.name || 'User'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaCalendar size={12} /> {new Date(remark.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => deleteRemark(remark._id)}
                    style={{
                      padding: '6px 12px', background: '#fee2e2', color: '#dc2626',
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <FaTrash size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Remark Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Add New Remark</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Client *</label>
              <select
                value={newRemark.client}
                onChange={(e) => setNewRemark({ ...newRemark, client: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name} — {c.company}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Content *</label>
              <textarea
                value={newRemark.content}
                onChange={(e) => setNewRemark({ ...newRemark, content: e.target.value })}
                placeholder="Enter remark content"
                rows="4"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Type</label>
              <select
                value={newRemark.type}
                onChange={(e) => setNewRemark({ ...newRemark, type: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
                <option value="follow-up">Follow-up</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Visibility</label>
              <select
                value={newRemark.visibility}
                onChange={(e) => setNewRemark({ ...newRemark, visibility: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              >
                <option value="public">Public</option>
                <option value="team">Team</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRemark}
                disabled={saving}
                style={{
                  padding: '10px 20px', background: saving ? '#93c5fd' : '#2563eb', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Adding...' : 'Add Remark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Remarks;
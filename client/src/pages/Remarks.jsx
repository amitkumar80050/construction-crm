import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaComment, FaUser, FaCalendar, FaTrash, FaEdit } from 'react-icons/fa';

const Remarks = () => {
  const navigate = useNavigate();
  const [remarks, setRemarks] = useState([
    {
      id: 1,
      client: 'ABC Construction',
      user: 'Amit',
      content: 'Initial meeting went well. Client interested in our services.',
      type: 'meeting',
      date: '2024-01-15',
      visibility: 'public'
    },
    {
      id: 2,
      client: 'XYZ Builders',
      user: 'Amit',
      content: 'Sent proposal for review. Awaiting feedback.',
      type: 'follow-up',
      date: '2024-01-16',
      visibility: 'team'
    },
    {
      id: 3,
      client: 'PQR Developers',
      user: 'Amit',
      content: 'Contract signed. Project will start next month.',
      type: 'call',
      date: '2024-01-14',
      visibility: 'public'
    }
  ]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRemark, setNewRemark] = useState({
    client: '',
    content: '',
    type: 'note',
    visibility: 'public'
  });

  const handleAddRemark = () => {
    if (!newRemark.client || !newRemark.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    const remark = {
      id: remarks.length + 1,
      ...newRemark,
      user: 'Amit',
      date: new Date().toISOString().split('T')[0]
    };

    setRemarks([remark, ...remarks]);
    setShowAddModal(false);
    setNewRemark({ client: '', content: '', type: 'note', visibility: 'public' });
    toast.success('Remark added successfully!');
  };

  const deleteRemark = (id) => {
    if (window.confirm('Are you sure you want to delete this remark?')) {
      setRemarks(remarks.filter(r => r.id !== id));
      toast.success('Remark deleted successfully!');
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'call': return '#2563eb';
      case 'meeting': return '#8b5cf6';
      case 'follow-up': return '#f59e0b';
      case 'note': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getVisibilityBadge = (visibility) => {
    const colors = {
      public: '#22c55e',
      team: '#8b5cf6',
      private: '#ef4444'
    };
    return {
      background: `${colors[visibility]}20`,
      color: colors[visibility]
    };
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Remarks & Notes</h1>
          <p style={{ color: '#64748b' }}>Track all client interactions and notes</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaPlus /> Add Remark
        </button>
      </div>

      {/* Remarks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {remarks.map((remark) => (
          <div
            key={remark.id}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${getTypeColor(remark.type)}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <strong style={{ color: '#1e293b', fontSize: '16px' }}>{remark.client}</strong>
                  <span style={{
                    padding: '2px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    background: `${getTypeColor(remark.type)}20`,
                    color: getTypeColor(remark.type)
                  }}>
                    {remark.type}
                  </span>
                  <span style={{
                    padding: '2px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    background: getVisibilityBadge(remark.visibility).background,
                    color: getVisibilityBadge(remark.visibility).color
                  }}>
                    {remark.visibility}
                  </span>
                </div>
                <p style={{ color: '#475569', marginBottom: '12px' }}>{remark.content}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaUser size={12} /> {remark.user}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaCalendar size={12} /> {remark.date}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => deleteRemark(remark.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FaTrash size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Remark Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Add New Remark</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Client Name *</label>
              <input
                type="text"
                value={newRemark.client}
                onChange={(e) => setNewRemark({ ...newRemark, client: e.target.value })}
                placeholder="Enter client name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Content *</label>
              <textarea
                value={newRemark.content}
                onChange={(e) => setNewRemark({ ...newRemark, content: e.target.value })}
                placeholder="Enter remark content"
                rows="4"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Type</label>
              <select
                value={newRemark.type}
                onChange={(e) => setNewRemark({ ...newRemark, type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="follow-up">Follow-up</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Visibility</label>
              <select
                value={newRemark.visibility}
                onChange={(e) => setNewRemark({ ...newRemark, visibility: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              >
                <option value="public">Public</option>
                <option value="team">Team</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRemark}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Add Remark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Remarks;
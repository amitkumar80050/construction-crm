import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaTimes, FaUser, FaCalendar, FaTrash, FaPlus, FaCommentDots } from 'react-icons/fa';
import remarkService from '../../services/remarkService';
import AddRemark from './AddRemark';

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

const getVisibilityStyle = (visibility) => {
  const colors = { public: '#22c55e', team: '#8b5cf6', private: '#ef4444' };
  const c = colors[visibility] || '#64748b';
  return { background: `${c}20`, color: c };
};

const RemarkHistory = ({ clientId, clientName, isOpen, onClose, onRemarkAdded }) => {
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchRemarks = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await remarkService.getRemarksByClient(clientId);
      setRemarks(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load remarks');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (isOpen) {
      fetchRemarks();
      setShowAddForm(false);
    }
  }, [isOpen, fetchRemarks]);

  const handleAdded = (newRemark) => {
    setRemarks(prev => [newRemark, ...prev]);
    setShowAddForm(false);
    if (onRemarkAdded) onRemarkAdded(newRemark);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this remark?')) return;
    try {
      await remarkService.deleteRemark(id);
      setRemarks(prev => prev.filter(r => r._id !== id));
      toast.success('Remark deleted');
    } catch (error) {
      toast.error('Failed to delete remark');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '12px', width: '100%',
          maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 20px 12px', borderBottom: '1px solid #e2e8f0'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', color: '#1e293b', margin: 0 }}>Remark History</h2>
            {clientName && <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>{clientName}</p>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '18px' }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {showAddForm ? (
            <AddRemark
              clientId={clientId}
              onAdded={handleAdded}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%', padding: '10px', marginBottom: '16px',
                background: '#eff6ff', color: '#2563eb', border: '1px dashed #93c5fd',
                borderRadius: '8px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500'
              }}
            >
              <FaPlus size={12} /> Add Remark
            </button>
          )}

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading remarks...</p>
          ) : remarks.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
              <FaCommentDots size={28} style={{ marginBottom: '8px' }} />
              <p>No remarks yet for this client.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {remarks.map((remark) => (
                <div
                  key={remark._id}
                  style={{
                    background: '#f8fafc', padding: '14px', borderRadius: '10px',
                    borderLeft: `4px solid ${getTypeColor(remark.type)}`
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: '20px', fontSize: '11px',
                      background: `${getTypeColor(remark.type)}20`, color: getTypeColor(remark.type)
                    }}>
                      {remark.type}
                    </span>
                    <span style={{
                      padding: '2px 10px', borderRadius: '20px', fontSize: '11px',
                      ...getVisibilityStyle(remark.visibility)
                    }}>
                      {remark.visibility}
                    </span>
                  </div>

                  <p style={{ color: '#334155', margin: '0 0 10px', fontSize: '14px', lineHeight: 1.5 }}>
                    {remark.content}
                  </p>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '12px', color: '#64748b'
                  }}>
                    <div style={{ display: 'flex', gap: '14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaUser size={10} /> {remark.user?.name || 'User'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaCalendar size={10} /> {new Date(remark.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(remark._id)}
                      style={{
                        background: 'none', border: 'none', color: '#dc2626',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemarkHistory;
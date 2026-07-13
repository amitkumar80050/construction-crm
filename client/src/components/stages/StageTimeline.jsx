import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaTimes, FaUser, FaCalendar, FaLayerGroup, FaArrowRight } from 'react-icons/fa';
import stageService from '../../services/stageService';
import AddStage from './AddStage';

const StageTimeline = ({ clientId, clientName, currentStage, isOpen, onClose, onStageMoved }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [current, setCurrent] = useState(currentStage);

  const fetchHistory = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await stageService.getClientStageHistory(clientId);
      setHistory(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load stage history');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      setShowMoveForm(false);
      setCurrent(currentStage);
    }
  }, [isOpen, fetchHistory, currentStage]);

  const handleMoved = (updatedClient) => {
    setShowMoveForm(false);
    setCurrent(updatedClient?.currentStage || current);
    fetchHistory();
    if (onStageMoved) onStageMoved(updatedClient);
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
            <h2 style={{ fontSize: '18px', color: '#1e293b', margin: 0 }}>Stage Timeline</h2>
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
          {/* Current stage badge */}
          {current && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: `${current.color || '#2563eb'}15`,
              border: `1px solid ${current.color || '#2563eb'}40`,
              padding: '10px 14px', borderRadius: '10px', marginBottom: '16px'
            }}>
              <FaLayerGroup color={current.color || '#2563eb'} />
              <span style={{ fontWeight: 600, color: current.color || '#2563eb' }}>
                Current: {current.name}
              </span>
            </div>
          )}

          {showMoveForm ? (
            <AddStage
              clientId={clientId}
              currentStageId={current?._id}
              onMoved={handleMoved}
              onCancel={() => setShowMoveForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowMoveForm(true)}
              style={{
                width: '100%', padding: '10px', marginBottom: '16px',
                background: '#eff6ff', color: '#2563eb', border: '1px dashed #93c5fd',
                borderRadius: '8px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500'
              }}
            >
              <FaArrowRight size={12} /> Move to Another Stage
            </button>
          )}

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading history...</p>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
              <FaLayerGroup size={28} style={{ marginBottom: '8px' }} />
              <p>No stage changes recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((entry) => (
                <div
                  key={entry._id}
                  style={{
                    background: '#f8fafc', padding: '14px', borderRadius: '10px',
                    borderLeft: '4px solid #2563eb'
                  }}
                >
                  <p style={{ color: '#334155', margin: '0 0 10px', fontSize: '14px', lineHeight: 1.5 }}>
                    {entry.description}
                  </p>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaUser size={10} /> {entry.user?.name || 'User'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaCalendar size={10} /> {new Date(entry.createdAt).toLocaleString()}
                    </span>
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

export default StageTimeline;
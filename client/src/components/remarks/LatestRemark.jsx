import React, { useEffect, useState } from 'react';
import { FaCommentDots, FaUser } from 'react-icons/fa';
import remarkService from '../../services/remarkService';
import RemarkHistory from './RemarkHistory';

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

/**
 * Shows the most recent remark for a client (e.g. inside ClientCard).
 * Clicking it opens the full RemarkHistory dialog for that client.
 */
const LatestRemark = ({ clientId, clientName }) => {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchLatest = async () => {
      try {
        const res = await remarkService.getRemarksByClient(clientId);
        const list = res.data?.data || [];
        if (mounted) setLatest(list[0] || null);
      } catch (error) {
        if (mounted) setLatest(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (clientId) fetchLatest();
    return () => { mounted = false; };
  }, [clientId]);

  const handleClick = (e) => {
    e.stopPropagation(); // avoid triggering parent card's onClick, if any
    setHistoryOpen(true);
  };

  const handleClose = () => setHistoryOpen(false);

  const handleRemarkAdded = (newRemark) => {
    setLatest(newRemark); // keep the card's preview in sync
  };

  if (loading) {
    return <div style={{ fontSize: '12px', color: '#94a3b8' }}>Loading remarks...</div>;
  }

  return (
    <>
      <div
        onClick={handleClick}
        title="View remark history"
        style={{
          cursor: 'pointer',
          padding: '8px 10px',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
      >
        {latest ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: getTypeColor(latest.type)
              }} />
              <span style={{ fontSize: '11px', color: getTypeColor(latest.type), fontWeight: 600, textTransform: 'capitalize' }}>
                {latest.type}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>
                {new Date(latest.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p style={{
              margin: 0, fontSize: '13px', color: '#475569',
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {latest.content}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
              <FaUser size={9} /> {latest.user?.name || 'User'}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <FaCommentDots size={12} /> No remarks yet — click to add
          </div>
        )}
      </div>

      <RemarkHistory
        clientId={clientId}
        clientName={clientName}
        isOpen={historyOpen}
        onClose={handleClose}
        onRemarkAdded={handleRemarkAdded}
      />
    </>
  );
};

export default LatestRemark;
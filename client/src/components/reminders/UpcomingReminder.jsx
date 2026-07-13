import React, { useEffect, useState } from 'react';
import { FaBell, FaCalendar } from 'react-icons/fa';
import reminderService from '../../services/reminderService';
import ReminderHistory from './ReminderHistory';

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#64748b';
    default: return '#64748b';
  }
};

const UpcomingReminder = ({ clientId, clientName }) => {
  const [upcoming, setUpcoming] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fetchUpcoming = async () => {
    try {
      const res = await reminderService.getRemindersByClient(clientId);
      const list = res.data?.data || [];
      // Show the soonest pending/overdue reminder first, else the latest overall
      const pending = list
        .filter(r => r.status !== 'completed')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setUpcoming(pending[0] || list[0] || null);
    } catch (error) {
      setUpcoming(null);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  if (!clientId) return;

  let mounted = true;

  const load = async () => {
    try {
      const res = await reminderService.getRemindersByClient(clientId);
      const list = res.data?.data || [];
      const pending = list
        .filter(r => r.status !== 'completed')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      if (mounted) setUpcoming(pending[0] || list[0] || null);
    } catch (error) {
      if (mounted) setUpcoming(null);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  load();
  return () => { mounted = false; };
}, [clientId]);

  const handleClick = (e) => {
    e.stopPropagation();
    setHistoryOpen(true);
  };

  const handleClose = () => setHistoryOpen(false);

  const handleChanged = () => {
    fetchUpcoming(); // refresh preview after add/complete/delete
  };

  if (loading) {
    return <div style={{ fontSize: '12px', color: '#94a3b8' }}>Loading reminders...</div>;
  }

  const color = upcoming ? getPriorityColor(upcoming.priority) : '#94a3b8';

  return (
    <>
      <div
        onClick={handleClick}
        title="View reminder history"
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
        {upcoming ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <FaBell size={11} color={color} />
              <span style={{
                fontSize: '13px', color: '#334155', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
              }}>
                {upcoming.title}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
              <FaCalendar size={9} /> {new Date(upcoming.dueDate).toLocaleDateString()}
              {upcoming.status === 'overdue' && (
                <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: '4px' }}>Overdue</span>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <FaBell size={12} /> No reminders — click to add
          </div>
        )}
      </div>

      <ReminderHistory
        clientId={clientId}
        clientName={clientName}
        isOpen={historyOpen}
        onClose={handleClose}
        onReminderChanged={handleChanged}
      />
    </>
  );
};

export default UpcomingReminder;
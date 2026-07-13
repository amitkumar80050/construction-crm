import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaTimes, FaCalendar, FaTrash, FaPlus, FaBell, FaCheck } from 'react-icons/fa';
import reminderService from '../../services/reminderService';
import AddReminder from './AddReminder';

const getPriorityStyle = (priority) => {
  const colors = { low: '#64748b', medium: '#f59e0b', high: '#ef4444' };
  const c = colors[priority] || '#64748b';
  return { background: `${c}20`, color: c };
};

const getStatusStyle = (status) => {
  const colors = { pending: '#2563eb', completed: '#22c55e', overdue: '#ef4444' };
  const c = colors[status] || '#64748b';
  return { background: `${c}20`, color: c };
};

const ReminderHistory = ({ clientId, clientName, isOpen, onClose, onReminderChanged }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await reminderService.getRemindersByClient(clientId);
      setReminders(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
      setShowAddForm(false);
    }
  }, [isOpen, fetchReminders]);

  const handleAdded = (newReminder) => {
    setReminders(prev => [newReminder, ...prev]);
    setShowAddForm(false);
    if (onReminderChanged) onReminderChanged(newReminder);
  };

  const handleComplete = async (id) => {
    try {
      const res = await reminderService.completeReminder(id);
      const updated = res.data?.data || res.data;
      setReminders(prev => prev.map(r => (r._id === id ? updated : r)));
      toast.success('Reminder marked complete');
      if (onReminderChanged) onReminderChanged(updated);
    } catch (error) {
      toast.error('Failed to update reminder');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await reminderService.deleteReminder(id);
      setReminders(prev => prev.filter(r => r._id !== id));
      toast.success('Reminder deleted');
      if (onReminderChanged) onReminderChanged(null);
    } catch (error) {
      toast.error('Failed to delete reminder');
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
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 20px 12px', borderBottom: '1px solid #e2e8f0'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', color: '#1e293b', margin: 0 }}>Reminder History</h2>
            {clientName && <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>{clientName}</p>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '18px' }}
          >
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {showAddForm ? (
            <AddReminder
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
              <FaPlus size={12} /> Add Reminder
            </button>
          )}

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading reminders...</p>
          ) : reminders.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
              <FaBell size={28} style={{ marginBottom: '8px' }} />
              <p>No reminders yet for this client.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reminders.map((reminder) => (
                <div
                  key={reminder._id}
                  style={{
                    background: '#f8fafc', padding: '14px', borderRadius: '10px',
                    borderLeft: `4px solid ${getPriorityStyle(reminder.priority).color}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <strong style={{ color: '#1e293b', fontSize: '14px' }}>{reminder.title}</strong>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: '20px', fontSize: '11px',
                        ...getPriorityStyle(reminder.priority)
                      }}>
                        {reminder.priority}
                      </span>
                      <span style={{
                        padding: '2px 10px', borderRadius: '20px', fontSize: '11px',
                        ...getStatusStyle(reminder.status)
                      }}>
                        {reminder.status}
                      </span>
                    </div>
                  </div>

                  {reminder.description && (
                    <p style={{ color: '#334155', margin: '0 0 8px', fontSize: '13px' }}>
                      {reminder.description}
                    </p>
                  )}

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '12px', color: '#64748b'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaCalendar size={10} /> {new Date(reminder.dueDate).toLocaleString()}
                    </span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {reminder.status !== 'completed' && (
                        <button
                          onClick={() => handleComplete(reminder._id)}
                          style={{
                            background: 'none', border: 'none', color: '#22c55e',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <FaCheck size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(reminder._id)}
                        style={{
                          background: 'none', border: 'none', color: '#dc2626',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
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

export default ReminderHistory;
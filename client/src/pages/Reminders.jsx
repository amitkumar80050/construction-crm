import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaPlus, FaUser, FaCalendar, FaTrash, FaCheck,
  FaBell, FaExclamationTriangle
} from 'react-icons/fa';
import reminderService from '../services/reminderService';
import clientService from '../services/clientService';

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

const getBorderColor = (reminder) => {
  if (reminder.status === 'completed') return '#22c55e';
  if (reminder.status === 'overdue') return '#ef4444';
  const priorityColors = { low: '#64748b', medium: '#f59e0b', high: '#ef4444' };
  return priorityColors[reminder.priority] || '#2563eb';
};

const Reminders = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newReminder, setNewReminder] = useState({
    client: '',
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    type: 'task'
  });

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;

      const res = await reminderService.getReminders(params);
      setReminders(res.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load reminders';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await clientService.getClients({ limit: 100 });
      setClients(res.data?.data || []);
    } catch (error) {
      // Non-critical for this page; the add-reminder dropdown just stays empty
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleAddReminder = async () => {
    if (!newReminder.client || !newReminder.title.trim() || !newReminder.dueDate) {
      toast.error('Please select a client, title, and due date');
      return;
    }

    setSaving(true);
    try {
      await reminderService.createReminder({
        client: newReminder.client,
        title: newReminder.title.trim(),
        description: newReminder.description.trim(),
        dueDate: newReminder.dueDate,
        priority: newReminder.priority,
        type: newReminder.type
      });

      toast.success('Reminder added successfully!');
      setShowAddModal(false);
      setNewReminder({ client: '', title: '', description: '', dueDate: '', priority: 'medium', type: 'task' });
      fetchReminders();
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to add reminder';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      await reminderService.completeReminder(id);
      toast.success('Reminder marked as complete!');
      fetchReminders();
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to update reminder';
      toast.error(message);
    }
  };

  const deleteReminder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await reminderService.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r._id !== id));
      toast.success('Reminder deleted successfully!');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete reminder';
      toast.error(message);
    }
  };

  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Reminders</h1>
          <p style={{ color: '#64748b' }}>Manage your reminders and follow-ups</p>
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
          <FaPlus /> Add Reminder
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
            background: 'white', fontSize: '14px', cursor: 'pointer'
          }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
            background: 'white', fontSize: '14px', cursor: 'pointer'
          }}
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Reminders List */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Loading reminders...</p>
      ) : reminders.length === 0 ? (
        <div style={{
          background: 'white', padding: '40px', borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', color: '#94a3b8'
        }}>
          <FaBell size={32} style={{ marginBottom: '10px' }} />
          <p>No reminders found. Click "Add Reminder" to create one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reminders.map((reminder) => (
            <div
              key={reminder._id}
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: `4px solid ${getBorderColor(reminder)}`,
                opacity: reminder.status === 'completed' ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{
                      color: '#1e293b', fontSize: '16px', margin: 0,
                      textDecoration: reminder.status === 'completed' ? 'line-through' : 'none'
                    }}>
                      {reminder.title}
                    </h3>
                    <span style={{ padding: '2px 12px', borderRadius: '20px', fontSize: '12px', ...getPriorityStyle(reminder.priority) }}>
                      {reminder.priority}
                    </span>
                    <span style={{ padding: '2px 12px', borderRadius: '20px', fontSize: '12px', ...getStatusStyle(reminder.status) }}>
                      {reminder.status === 'overdue' && <FaExclamationTriangle size={10} style={{ marginRight: '4px' }} />}
                      {reminder.status}
                    </span>
                    <span style={{
                      padding: '2px 12px', borderRadius: '20px', fontSize: '12px',
                      background: '#f1f5f9', color: '#475569', textTransform: 'capitalize'
                    }}>
                      {reminder.type}
                    </span>
                  </div>

                  {reminder.description && (
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b' }}>{reminder.description}</p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#64748b', flexWrap: 'wrap' }}>
                    <span
                      onClick={() => reminder.client?._id && navigate(`/clients/${reminder.client._id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: reminder.client?._id ? 'pointer' : 'default' }}
                    >
                      <FaUser size={12} /> {reminder.client?.name || 'Unknown client'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaCalendar size={12} /> {formatDueDate(reminder.dueDate)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {reminder.status !== 'completed' && (
                    <button
                      onClick={() => handleComplete(reminder._id)}
                      style={{
                        padding: '6px 14px', background: '#dcfce7', color: '#16a34a',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <FaCheck size={12} /> Complete
                    </button>
                  )}
                  <button
                    onClick={() => deleteReminder(reminder._id)}
                    style={{
                      padding: '6px 14px', background: '#fee2e2', color: '#dc2626',
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

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Add New Reminder</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Client *</label>
              <select
                value={newReminder.client}
                onChange={(e) => setNewReminder({ ...newReminder, client: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name} — {c.company}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Title *</label>
              <input
                type="text"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                placeholder="e.g. Follow up on proposal"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Description</label>
              <textarea
                value={newReminder.description}
                onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                placeholder="Optional notes"
                rows="3"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Due Date *</label>
              <input
                type="datetime-local"
                value={newReminder.dueDate}
                onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Priority</label>
                <select
                  value={newReminder.priority}
                  onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Type</label>
                <select
                  value={newReminder.type}
                  onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                >
                  <option value="task">Task</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddReminder}
                disabled={saving}
                style={{
                  padding: '10px 20px', background: saving ? '#93c5fd' : '#2563eb', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Adding...' : 'Add Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
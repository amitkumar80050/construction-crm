import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaTimes } from 'react-icons/fa';
import reminderService from '../../services/reminderService';

const AddReminder = ({ clientId, onAdded, onCancel }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    type: 'task'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.dueDate) {
      toast.error('Please add a title and due date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await reminderService.createReminder({
        client: clientId,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        priority: form.priority,
        type: form.type
      });

      const created = res.data?.data || res.data;

      toast.success('Reminder added successfully!');
      setForm({ title: '', description: '', dueDate: '', priority: 'medium', type: 'task' });

      if (onAdded) onAdded(created);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add reminder';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ color: '#1e293b', fontSize: '14px' }}>New Reminder</strong>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <FaTimes />
          </button>
        )}
      </div>

      <input
        type="text"
        value={form.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder="Reminder title"
        autoFocus
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '10px'
        }}
      />

      <textarea
        value={form.description}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder="Description (optional)"
        rows="2"
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          resize: 'vertical',
          fontFamily: 'inherit',
          marginBottom: '10px'
        }}
      />

      <input
        type="datetime-local"
        value={form.dueDate}
        onChange={(e) => handleChange('dueDate', e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '10px'
        }}
      />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <select
          value={form.priority}
          onChange={(e) => handleChange('priority', e.target.value)}
          style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '120px' }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          value={form.type}
          onChange={(e) => handleChange('type', e.target.value)}
          style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '120px' }}
        >
          <option value="task">Task</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="follow-up">Follow-up</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaPlus size={12} /> {submitting ? 'Adding...' : 'Add Reminder'}
        </button>
      </div>
    </form>
  );
};

export default AddReminder;
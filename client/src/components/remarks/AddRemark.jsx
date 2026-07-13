import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';
import remarkService from '../../services/remarkService';

const AddRemark = ({ clientId, onAdded, onCancel }) => {
  const [form, setForm] = useState({
    content: '',
    type: 'note',
    visibility: 'public'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.content.trim()) {
      toast.error('Please enter remark content');
      return;
    }

    setSubmitting(true);
    try {
      const res = await remarkService.createRemark({
        client: clientId,
        content: form.content.trim(),
        type: form.type,
        visibility: form.visibility
      });

      const created = res.data?.data || res.data;

      toast.success('Remark added successfully!');
      setForm({ content: '', type: 'note', visibility: 'public' });

      if (onAdded) onAdded(created);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add remark';
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
        <strong style={{ color: '#1e293b', fontSize: '14px' }}>New Remark</strong>
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

      <textarea
        value={form.content}
        onChange={(e) => handleChange('content', e.target.value)}
        placeholder="Write a remark..."
        rows="3"
        autoFocus
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          resize: 'vertical',
          fontFamily: 'inherit',
          marginBottom: '12px'
        }}
      />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <select
          value={form.type}
          onChange={(e) => handleChange('type', e.target.value)}
          style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '120px' }}
        >
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="email">Email</option>
          <option value="follow-up">Follow-up</option>
        </select>

        <select
          value={form.visibility}
          onChange={(e) => handleChange('visibility', e.target.value)}
          style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '120px' }}
        >
          <option value="public">Public</option>
          <option value="team">Team</option>
          <option value="private">Private</option>
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
          <FaPaperPlane size={12} /> {submitting ? 'Adding...' : 'Add Remark'}
        </button>
      </div>
    </form>
  );
};

export default AddRemark;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaTimes, FaUser, FaCheck } from 'react-icons/fa';
import reminderService from '../../services/reminderService';
import Leadservice from '../../services/leadService';

const AddReminder = ({ LeadId, onAdded, onCancel }) => {
  // If a LeadId was passed in directly (e.g. opened from a specific Lead's
  // page), skip the search UI entirely and use it as-is.
  const preselected = !!LeadId;

  const [selectedLead, setSelectedLead] = useState(null);
  const [LeadNameInput, setLeadNameInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    type: 'task'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Load the preselected Lead's display info, if one was passed in
  useEffect(() => {
    const loadPreselected = async () => {
      if (!preselected) return;
      try {
        const res = await Leadservice.getLead(LeadId);
        setSelectedLead(res.data?.data || null);
      } catch (error) {
        // Non-fatal — form still works, just won't show the leadname
      }
    };
    loadPreselected();
  }, [LeadId, preselected]);

  // Debounced leadsearch by name (also matches company/email, per your
  // existing Leadservice.getLeads search param)
  const runSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await Leadservice.getLeads({ search: term.trim(), limit: 6 });
      setSearchResults(res.data?.data || []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleNameInputChange = (value) => {
    setLeadNameInput(value);
    setSelectedLead(null); // typing again clears any previous selection

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  };

  const handleSelectlead = (Lead) => {
    setSelectedLead(Lead);
    setLeadNameInput(Lead.name);
    setSearchResults([]);
  };

  const handleClearlead = () => {
    setSelectedLead(null);
    setLeadNameInput('');
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const targetLeadId = LeadId || selectedLead?._id;

    if (!targetLeadId) {
      toast.error('Please search and select a leadby name');
      return;
    }
    if (!form.title.trim() || !form.dueDate) {
      toast.error('Please add a title and due date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await reminderService.createReminder({
        Lead: targetLeadId,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        priority: form.priority,
        type: form.type
      });

      const created = res.data?.data || res.data;

      toast.success('Reminder added successfully!');
      setForm({ title: '', description: '', dueDate: '', priority: 'medium', type: 'task' });
      if (!preselected) {
        handleClearLead();
      }

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

      {/* lead— single text input, searches by name as you type */}
      {!preselected && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#1e293b' }}>
            leadName *
          </label>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={LeadNameInput}
              onChange={(e) => handleNameInputChange(e.target.value)}
              placeholder="Type leadname to search..."
              autoComplete="off"
              style={{
                width: '100%',
                padding: selectedlead ? '10px 36px 10px 10px' : '10px',
                border: `1px solid ${selectedlead ? '#93c5fd' : '#e2e8f0'}`,
                borderRadius: '8px',
                background: selectedlead ? '#eff6ff' : 'white'
              }}
            />
            {selectedlead && (
              <button
                type="button"
                onClick={handleClearLead}
                title="Change Lead"
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                  display: 'flex', alignItems: 'center'
                }}
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>

          {selectedlead && (
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a' }}>
              <FaCheck size={10} /> {selectedLead.company} · {selectedLead.email}
            </div>
          )}

          {/* Plain inline match list — not an overlay dropdown */}
          {!selectedlead && LeadNameInput.trim() && (
            <div style={{ marginTop: '8px' }}>
              {searching ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '6px 0' }}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '6px 0' }}>
                  No matching Leads found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {searchResults.map((Lead) => (
                    <div
                      key={Lead._id}
                      onClick={() => handleSelectLead(Lead)}
                      style={{
                        padding: '8px 10px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      <FaUser size={11} color="#94a3b8" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{Lead.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {Lead.company} {Lead.email ? `· ${Lead.email}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <input
        type="text"
        value={form.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder="Reminder title"
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
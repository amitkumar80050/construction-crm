import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaTimes, FaUser, FaCheck } from 'react-icons/fa';
import reminderService from '../../services/reminderService';
import clientService from '../../services/clientService';

const AddReminder = ({ clientId, onAdded, onCancel }) => {
  // If a clientId was passed in directly (e.g. opened from a specific client's
  // page), skip the search UI entirely and use it as-is.
  const preselected = !!clientId;

  const [selectedClient, setSelectedClient] = useState(null);
  const [clientNameInput, setClientNameInput] = useState('');
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

  // Load the preselected client's display info, if one was passed in
  useEffect(() => {
    const loadPreselected = async () => {
      if (!preselected) return;
      try {
        const res = await clientService.getClient(clientId);
        setSelectedClient(res.data?.data || null);
      } catch (error) {
        // Non-fatal — form still works, just won't show the client name
      }
    };
    loadPreselected();
  }, [clientId, preselected]);

  // Debounced client search by name (also matches company/email, per your
  // existing clientService.getClients search param)
  const runSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await clientService.getClients({ search: term.trim(), limit: 6 });
      setSearchResults(res.data?.data || []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleNameInputChange = (value) => {
    setClientNameInput(value);
    setSelectedClient(null); // typing again clears any previous selection

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientNameInput(client.name);
    setSearchResults([]);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientNameInput('');
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const targetClientId = clientId || selectedClient?._id;

    if (!targetClientId) {
      toast.error('Please search and select a client by name');
      return;
    }
    if (!form.title.trim() || !form.dueDate) {
      toast.error('Please add a title and due date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await reminderService.createReminder({
        client: targetClientId,
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
        handleClearClient();
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

      {/* Client — single text input, searches by name as you type */}
      {!preselected && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#1e293b' }}>
            Client Name *
          </label>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={clientNameInput}
              onChange={(e) => handleNameInputChange(e.target.value)}
              placeholder="Type client name to search..."
              autoComplete="off"
              style={{
                width: '100%',
                padding: selectedClient ? '10px 36px 10px 10px' : '10px',
                border: `1px solid ${selectedClient ? '#93c5fd' : '#e2e8f0'}`,
                borderRadius: '8px',
                background: selectedClient ? '#eff6ff' : 'white'
              }}
            />
            {selectedClient && (
              <button
                type="button"
                onClick={handleClearClient}
                title="Change client"
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

          {selectedClient && (
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a' }}>
              <FaCheck size={10} /> {selectedClient.company} · {selectedClient.email}
            </div>
          )}

          {/* Plain inline match list — not an overlay dropdown */}
          {!selectedClient && clientNameInput.trim() && (
            <div style={{ marginTop: '8px' }}>
              {searching ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '6px 0' }}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '6px 0' }}>
                  No matching clients found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {searchResults.map((client) => (
                    <div
                      key={client._id}
                      onClick={() => handleSelectClient(client)}
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
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{client.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {client.company} {client.email ? `· ${client.email}` : ''}
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
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaTimes, FaCommentDots, FaUser, FaCheck } from 'react-icons/fa';
import remarkService from '../../services/remarkService';
import leadService from '../../services/leadService';

const AddRemark = ({ LeadId, leadId, onAdded, onCancel }) => {
  const initialLeadId = LeadId || leadId;
  const preselected = !!initialLeadId;

  const [selectedLead, setSelectedLead] = useState(null);
  const [leadNameInput, setLeadNameInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const [form, setForm] = useState({
    content: '',
    type: 'note',
    visibility: 'public'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // If a lead was preselected, fetch lead info for display if needed
  useEffect(() => {
    const loadPreselected = async () => {
      if (!preselected) return;
      try {
        const res = await leadService.getLead(initialLeadId);
        setSelectedLead(res.data?.data || null);
      } catch (error) {
        // Non-fatal — form still functions with initialLeadId
      }
    };
    loadPreselected();
  }, [initialLeadId, preselected]);

  // Debounced lead search for standalone use (when no LeadId was passed)
  const runSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await leadService.getLeads({ search: term.trim(), limit: 6 });
      setSearchResults(res.data?.data || []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleNameInputChange = (value) => {
    setLeadNameInput(value);
    setSelectedLead(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  };

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    setLeadNameInput(lead.name);
    setSearchResults([]);
  };

  const handleClearLead = () => {
    setSelectedLead(null);
    setLeadNameInput('');
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const targetLeadId = initialLeadId || selectedLead?._id;

    if (!targetLeadId) {
      toast.error('Please select a lead');
      return;
    }

    if (!form.content.trim()) {
      toast.error('Please enter remark content');
      return;
    }

    setSubmitting(true);
    try {
      const res = await remarkService.createRemark({
        Lead: targetLeadId,
        content: form.content.trim(),
        type: form.type,
        visibility: form.visibility
      });

      const created = res.data?.data || res.data;

      toast.success('Remark added successfully!');
      setForm({ content: '', type: 'note', visibility: 'public' });

      if (!preselected) {
        handleClearLead();
      }

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
        <strong style={{ color: '#1e293b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FaCommentDots style={{ color: '#2563eb' }} /> New Remark
        </strong>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            title="Close"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Lead selector (only shown when not preselected) */}
      {!preselected && (
        <div style={{ marginBottom: '12px', position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Lead *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={leadNameInput}
              onChange={(e) => handleNameInputChange(e.target.value)}
              placeholder="Search lead by name..."
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
            {selectedLead && (
              <span
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#16a34a',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                <FaCheck size={10} /> Selected
              </span>
            )}
          </div>

          {/* Search dropdown results */}
          {searchResults.length > 0 && !selectedLead && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                marginTop: '4px',
                maxHeight: '180px',
                overflowY: 'auto',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                zIndex: 20
              }}
            >
              {searchResults.map((lead) => (
                <div
                  key={lead._id}
                  onClick={() => handleSelectLead(lead)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{lead.name}</div>
                  {lead.company && <div style={{ fontSize: '11px', color: '#64748b' }}>{lead.company}</div>}
                </div>
              ))}
            </div>
          )}
          {searching && (
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Searching leads...</div>
          )}
        </div>
      )}

      {/* Remark Content Textarea */}
      <div style={{ marginBottom: '12px' }}>
        <textarea
          value={form.content}
          onChange={(e) => handleChange('content', e.target.value)}
          placeholder="Write your remark or notes here..."
          rows="3"
          autoFocus
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            resize: 'vertical',
            fontFamily: 'inherit',
            fontSize: '13px',
            boxSizing: 'border-box',
            outline: 'none'
          }}
          onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
          onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
        />
      </div>

      {/* Remark Type & Visibility */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Remark Type
          </label>
          <select
            value={form.type}
            onChange={(e) => handleChange('type', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: 'white',
              fontSize: '13px',
              color: '#1e293b',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            <option value="note">📝 Note</option>
            <option value="call">📞 Call</option>
            <option value="meeting">👥 Meeting</option>
            <option value="email">✉️ Email</option>
            <option value="follow-up">⏰ Follow-up</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Visibility
          </label>
          <select
            value={form.visibility}
            onChange={(e) => handleChange('visibility', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: 'white',
              fontSize: '13px',
              color: '#1e293b',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            <option value="public">🌐 Public (All)</option>
            <option value="team">👥 Team</option>
            <option value="private">🔒 Private (Only me)</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
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
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          <FaPlus size={11} /> {submitting ? 'Adding...' : 'Add Remark'}
        </button>
      </div>
    </form>
  );
};

export default AddRemark;
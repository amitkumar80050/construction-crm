import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const STAGES = ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'];

const normalizeStage = (stage) => {
  if (!stage) return 'NEW';
  if (typeof stage === 'string') return stage.toUpperCase().replace(/\s+/g, '_');
  if (typeof stage?.name === 'string') return stage.name.toUpperCase().replace(/\s+/g, '_');
  return 'NEW';
};

const LeadStageModal = ({ lead, onClose, onUpdated }) => {
  const { user } = useAuth();
  const leadId = lead?._id || lead?.id;
  const currentStage = useMemo(() => normalizeStage(lead?.pipelineStage || lead?.currentStage), [lead]);
  const allowedStages = useMemo(() => {
    const roleMap = {
      admin: STAGES,
      manager: STAGES,
      telecaller: ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED'],
      'sales executer': ['SITE_VISIT_PLANNED', 'SITE_VISIT_DONE'],
    };
    return roleMap[user?.role] || STAGES;
  }, [user?.role]);

  const stageOptions = useMemo(() => {
    return allowedStages.filter((s) => s !== currentStage || s === 'FOLLOW_UP');
  }, [allowedStages, currentStage]);

  const [newStage, setNewStage] = useState(stageOptions[0] || '');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stageOptions.length > 0 && !stageOptions.includes(newStage)) {
      setNewStage(stageOptions[0]);
    }
  }, [stageOptions, newStage]);

  const save = async () => {
    const trimmedNotes = notes.trim();

    if (!trimmedNotes) {
      toast.error('Notes are required to log the transition in lead stage history.');
      return;
    }

    if (!newStage) {
      toast.error('Please select a target pipeline stage.');
      return;
    }

    if (newStage === 'FOLLOW_UP' && !followUpDate) {
      toast.error('Please specify a follow-up date.');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/leads/${leadId}/stage`, {
        newStage,
        notes: trimmedNotes,
        ...(followUpDate ? { followUpDate } : {}),
      });
      toast.success(`Stage transitioned to ${newStage.replace(/_/g, ' ')}!`);
      onUpdated?.();
      onClose?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update stage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '16px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
          Transition Stage — {lead?.name || 'Lead'}
        </h3>
        <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '16px' }}>
          Current Stage: <strong style={{ color: '#2563eb' }}>{currentStage.replace(/_/g, ' ')}</strong>
        </div>

        {stageOptions.length > 0 ? (
          <>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Next Pipeline Stage
            </label>
            <select
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}
            >
              {stageOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            {newStage === 'SITE_VISIT_PLANNED' && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#1e40af', marginBottom: '14px', display: 'flex', gap: '8px' }}>
                <FaInfoCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Advancing to <strong>Site Visit Planned</strong> triggers an in-app and email alert to your Team Manager to assign an active Field Sales Executive.
                </span>
              </div>
            )}

            {newStage === 'FOLLOW_UP' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Next Follow-up Date (Required)
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Transition Reason & Call Outcome Notes (Required)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Record reason for stage change..."
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '9px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{
                  padding: '9px 18px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {saving ? 'Updating...' : 'Advance Stage'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <FaExclamationTriangle size={24} color="#d97706" style={{ marginBottom: '8px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#1e293b' }}>
              Workflow Halted at {currentStage.replace(/_/g, ' ')}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
              {currentStage === 'SITE_VISIT_PLANNED'
                ? 'Telecallers cannot advance past Site Visit Planned. Your Team Manager must assign a Sales Executive to conduct the field inspection.'
                : currentStage === 'SITE_VISIT_DONE'
                ? 'The site visit has been completed by field execution. The Team Manager or Admin may now prepare the formal Quotation.'
                : 'No further automated stage transitions are permitted for your role.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{ marginTop: '16px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadStageModal;
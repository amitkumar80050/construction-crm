import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const STAGES = ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'];

const normalizeStage = (stage) => {
  if (!stage) return 'NEW';

  if (typeof stage === 'string') {
    return stage.toUpperCase().replace(/\s+/g, '_');
  }

  if (typeof stage?.name === 'string') {
    return stage.name.toUpperCase().replace(/\s+/g, '_');
  }

  return 'NEW';
};

const LeadStageModal = ({ lead, onClose, onUpdated }) => {
  const { user } = useAuth();
  const leadId = lead?._id || lead?.id;
  const currentStage = useMemo(() => normalizeStage(lead?.pipelineStage || lead?.currentStage), [lead]);
  const nextStage = STAGES[STAGES.indexOf(currentStage) + 1];
  const allowedStages = {
    admin: STAGES.slice(1),
    manager: ['QUOTATION', 'CONVERTED'],
    telecaller: ['CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED'],
    'sales executer': ['SITE_VISIT_DONE'],
  }[user?.role] || [];
  const stageOptions = nextStage && allowedStages.includes(nextStage) ? [nextStage] : [];

  const [newStage, setNewStage] = useState(stageOptions[0] || '');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmedNotes = notes.trim();

    if (!trimmedNotes) {
      toast.error('Notes are required to update the lead stage.');
      return;
    }

    if (!stageOptions.includes(newStage)) {
      toast.error('There is no next stage available for your role.');
      return;
    }

    if (newStage === 'FOLLOW_UP' && !followUpDate) {
      toast.error('Please select a follow-up date before moving to Follow Up.');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/leads/${leadId}/stage`, {
        newStage,
        notes: trimmedNotes,
        ...(followUpDate ? { followUpDate } : {}),
      });
      toast.success('Stage updated successfully');
      onUpdated?.();
      onClose?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update stage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '360px' }}>
        <h3>Update Stage — {lead?.name || 'Lead'}</h3>
        <label>New Stage</label>
        <select value={newStage} onChange={(e) => setNewStage(e.target.value)} disabled={!stageOptions.length} style={{ width: '100%', padding: '8px', margin: '6px 0 12px' }}>
          {stageOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        {newStage === 'FOLLOW_UP' && (
          <>
            <label>Follow-up Date</label>
            <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} style={{ width: '100%', padding: '8px', margin: '6px 0 12px' }} />
          </>
        )}
        <label>Notes (required)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '8px', margin: '6px 0 16px' }} />
        {!stageOptions.length && <p role="status" style={{ color: '#64748b' }}>No next stage is available for your role.</p>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={save} disabled={saving || !stageOptions.length}>{saving ? 'Saving...' : 'Update Stage'}</button>
        </div>
      </div>
    </div>
  );
};

export default LeadStageModal;
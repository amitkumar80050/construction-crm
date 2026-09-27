import React, { useState } from 'react';
import { toast } from 'react-toastify';
import siteVisitService from '../../services/siteVisitService';

const REASONS = ['CLIENT_UNAVAILABLE', 'POSTPONED', 'WRONG_ADDRESS', 'NOT_INTERESTED', 'OTHER'];

const VisitNotDoneModal = ({ visitId, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) return toast.error('Please select a reason');
    setSubmitting(true);
    try {
      await siteVisitService.markNotDone(visitId, { notDoneReason: reason, nextDate: nextDate || undefined });
      toast.success('Visit marked not done');
      onDone();
    } catch (error) {
      toast.error('Unable to update visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '320px' }}>
        <h3>Visit Not Done</h3>
        <label style={{ display: 'block', margin: '12px 0 6px', fontSize: '13px' }}>Reason</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: '8px' }}>
          <option value="">Select reason...</option>
          {REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
        <label style={{ display: 'block', margin: '14px 0 6px', fontSize: '13px' }}>Next Date (optional)</label>
        <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={submit} disabled={submitting} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px' }}>
            {submitting ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default VisitNotDoneModal;
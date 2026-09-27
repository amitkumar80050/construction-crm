import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaStickyNote, FaPhone, FaTimes } from 'react-icons/fa';
import leadService from '../../services/leadService';
import LeadStageModal from './LeadStageModal';

const LeadDetailModal = ({ leadDetail, onClose, onUpdated }) => {
  const [note, setNote] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);
  const { lead, history, notes } = leadDetail;

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return toast.error('Note is required');
    try {
      await leadService.addNote(lead._id, note.trim());
      toast.success('Note added');
      setNote('');
      onUpdated();
    } catch (error) {
      toast.error('Unable to add note');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: 'min(700px, 92vw)', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>{lead.name}</h2>
            <p style={{ color: '#64748b', margin: '4px 0' }}>{lead.company} · {lead.phone} · Stage: {lead.pipelineStage?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FaTimes /></button>
        </div>

        <button onClick={() => setShowStageModal(true)} style={{ padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
          Change Stage
        </button>

        <h4>Stage History</h4>
        {history.length === 0 ? <p style={{ color: '#94a3b8' }}>No stage changes yet.</p> : history.map((h) => (
          <div key={h._id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
            <strong>{h.oldStage} → {h.newStage}</strong> by {h.changedBy?.name} — {new Date(h.changedAt).toLocaleString()}
            <p style={{ color: '#64748b', margin: '4px 0 0' }}>{h.notes}</p>
          </div>
        ))}

        <h4 style={{ marginTop: '20px' }}>Call Notes (most recent first)</h4>
        {notes.length === 0 ? <p style={{ color: '#94a3b8' }}>No notes yet.</p> : notes.map((n) => (
          <div key={n._id} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <FaStickyNote color="#2563eb" style={{ marginTop: '2px' }} />
            <div>
              <strong>{n.user?.name}</strong> <small style={{ color: '#94a3b8' }}>{new Date(n.createdAt).toLocaleString()}</small>
              <p style={{ margin: '4px 0 0' }}>{n.content}</p>
            </div>
          </div>
        ))}

        <form onSubmit={addNote} style={{ marginTop: '16px' }}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Record the call outcome..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px' }}><FaPhone size={11} /> Add Call Note</button>
        </form>
      </div>

      {showStageModal && (
        <LeadStageModal lead={lead} onClose={() => setShowStageModal(false)} onUpdated={onUpdated} />
      )}
    </div>
  );
};
export default LeadDetailModal;
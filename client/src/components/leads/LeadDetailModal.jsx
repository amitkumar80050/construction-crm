import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaStickyNote, FaPhone, FaTimes, FaWhatsapp,
  FaPhoneAlt, FaMapMarkerAlt, FaCalendarCheck
} from 'react-icons/fa';
import leadService from '../../services/leadService';
import LeadStageModal from './LeadStageModal';
import { useAuth } from '../../hooks/useAuth';

const LeadDetailModal = ({ leadDetail, onClose, onUpdated }) => {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);
  const { lead, history, notes } = leadDetail;

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return toast.error('Note is required');
    try {
      await leadService.addNote(lead._id, note.trim());
      toast.success('Call note appended successfully');
      setNote('');
      onUpdated();
    } catch (error) {
      toast.error('Unable to add note');
    }
  };

  const isManagerOrAdmin = ['admin', 'manager'].includes(user?.role);
  const leadPhone = lead?.phone;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: 'min(720px, 94vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{lead.name}</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '13px' }}>
              {lead.company ? `${lead.company} · ` : ''}
              {leadPhone} · Stage:{' '}
              <span style={{ fontWeight: 600, color: '#2563eb' }}>
                {lead.pipelineStage?.replace(/_/g, ' ')}
              </span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}>
            <FaTimes />
          </button>
        </div>

        {/* Action Buttons: Call, WhatsApp, Stage Update */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {leadPhone && (
            <>
              <a
                href={`tel:${leadPhone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #bfdbfe'
                }}
              >
                <FaPhoneAlt size={11} /> Call Prospect
              </a>

              <a
                href={`https://wa.me/${leadPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #bbf7d0'
                }}
              >
                <FaWhatsapp size={14} /> WhatsApp
              </a>
            </>
          )}

          <button
            onClick={() => setShowStageModal(true)}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Change Stage
          </button>
        </div>

        {/* Workflow Status Banner for Site Visit Planned */}
        {lead.pipelineStage === 'SITE_VISIT_PLANNED' && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaMapMarkerAlt /> Site Visit Planned
              </div>
              <div style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>
                Workflow is pending Manager assignment of a Field Sales Executive.
              </div>
            </div>
            {isManagerOrAdmin && (
              <a
                href="/manager-dashboard"
                style={{
                  padding: '6px 12px',
                  background: '#1d4ed8',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Assign Executive in Manager Dashboard →
              </a>
            )}
          </div>
        )}

        {/* Stage Transition History */}
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Pipeline History</h4>
        <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px', marginBottom: '20px' }}>
          {history.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No stage changes yet.</p>
          ) : (
            history.map((h) => (
              <div key={h._id} style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{h.oldStage} → {h.newStage}</strong>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>{new Date(h.changedAt).toLocaleString()}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                  by {h.changedBy?.name || 'User'}
                </div>
                {h.notes && <p style={{ color: '#334155', margin: '4px 0 0', fontSize: '12px' }}>{h.notes}</p>}
              </div>
            ))
          )}
        </div>

        {/* Call Logs & Remarks */}
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Call Logs & Remarks</h4>
        <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px', marginBottom: '16px' }}>
          {notes.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No call notes logged yet.</p>
          ) : (
            notes.map((n) => (
              <div key={n._id} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                <FaStickyNote color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '12px' }}>{n.user?.name || 'Telecaller'}</strong>
                    <small style={{ color: '#94a3b8', fontSize: '11px' }}>{new Date(n.createdAt).toLocaleString()}</small>
                  </div>
                  <p style={{ margin: '2px 0 0', color: '#334155', fontSize: '13px' }}>{n.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Append Call Note Form */}
        <form onSubmit={addNote}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Append Call Outcome / Remark
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Record customer reaction, budget discussed, or follow-up requirements..."
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              marginBottom: '8px',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaPhone size={10} /> Add Call Note
          </button>
        </form>
      </div>

      {showStageModal && (
        <LeadStageModal lead={lead} onClose={() => setShowStageModal(false)} onUpdated={onUpdated} />
      )}
    </div>
  );
};

export default LeadDetailModal;
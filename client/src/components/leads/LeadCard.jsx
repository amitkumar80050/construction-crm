import React from 'react';
import { FaPhone, FaCalendarAlt } from 'react-icons/fa';

const STAGE_COLORS = {
  NEW: '#f59e0b', CONNECTED: '#2563eb', INTERESTED: '#8b5cf6', FOLLOW_UP: '#0ea5e9',
  SITE_VISIT_PLANNED: '#ec4899', SITE_VISIT_DONE: '#14b8a6', QUOTATION: '#eab308', CONVERTED: '#22c55e',
};

const LeadCard = ({ lead, onOpen, onReassign, showAssignee }) => {
  const color = STAGE_COLORS[lead.pipelineStage] || '#64748b';
  return (
    <div style={{ background: 'white', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <strong style={{ color: '#1e293b' }}>{lead.name}</strong>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{lead.company}</div>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', background: `${color}20`, color, fontWeight: 600 }}>
          {lead.pipelineStage?.replace(/_/g, ' ')}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', margin: '10px 0' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FaPhone size={10} /> {lead.phone}</span>
        {lead.followUpDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FaCalendarAlt size={10} /> {new Date(lead.followUpDate).toLocaleDateString()}</span>
        )}
      </div>
      {showAssignee && (
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
          Assigned: {lead.assignedTo?.name || 'Unassigned'}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onOpen(lead)} style={{ flex: 1, padding: '6px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
          View / Update
        </button>
        {onReassign && (
          <button onClick={() => onReassign(lead)} style={{ padding: '6px 10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            Reassign
          </button>
        )}
      </div>
    </div>
  );
};
export default LeadCard;
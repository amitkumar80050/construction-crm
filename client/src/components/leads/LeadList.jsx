import React, { useState } from 'react';
import LeadCard from './LeadCard';

const PIPELINE = ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'];

const LeadList = ({ leads, onOpen, onReassign, showAssignee }) => {
  const [view, setView] = useState('kanban');

  return (
    <div>
      <div style={{ marginBottom: '14px', display: 'flex', gap: '8px' }}>
        <button onClick={() => setView('kanban')} style={{ padding: '6px 14px', background: view === 'kanban' ? '#2563eb' : '#f1f5f9', color: view === 'kanban' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Kanban</button>
        <button onClick={() => setView('table')} style={{ padding: '6px 14px', background: view === 'table' ? '#2563eb' : '#f1f5f9', color: view === 'table' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Table</button>
      </div>

      {view === 'kanban' ? (
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
          {PIPELINE.map((stage) => (
            <div key={stage} style={{ minWidth: '240px', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                {stage.replace(/_/g, ' ')} ({leads.filter((l) => l.pipelineStage === stage).length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leads.filter((l) => l.pipelineStage === stage).map((lead) => (
                  <LeadCard key={lead._id} lead={lead} onOpen={onOpen} onReassign={onReassign} showAssignee={showAssignee} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Lead</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Stage</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Next call</th>
            {showAssignee && <th style={{ padding: '10px', textAlign: 'left' }}>Assigned</th>}
            <th style={{ padding: '10px' }}></th>
          </tr></thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px' }}><b>{lead.name}</b><br /><small style={{ color: '#94a3b8' }}>{lead.phone}</small></td>
                <td style={{ padding: '10px' }}>{lead.pipelineStage?.replace(/_/g, ' ')}</td>
                <td style={{ padding: '10px' }}>{lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : '-'}</td>
                {showAssignee && <td style={{ padding: '10px' }}>{lead.assignedTo?.name || 'Unassigned'}</td>}
                <td style={{ padding: '10px' }}>
                  <button onClick={() => onOpen(lead)} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Open</button>
                  {onReassign && <button onClick={() => onReassign(lead)} style={{ marginLeft: '6px', padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Reassign</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
export default LeadList;
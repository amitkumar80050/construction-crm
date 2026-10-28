import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBuilding, FaEnvelope, FaPhone, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import CurrentStage from '../stages/CurrentStage';
import LatestRemark from '../remarks/LatestRemark';
import UpcomingReminder from '../reminders/UpcomingReminder';

const getStatusColor = (status) => {
  switch (status) {
    case 'active': return '#22c55e';
    case 'lead': return '#f59e0b';
    case 'closed': return '#8b5cf6';
    case 'lost': return '#ef4444';
    default: return '#64748b';
  }
};

const LeadCard = ({ Lead, onDeleted, onStageMoved }) => {
  const navigate = useNavigate();

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDeleted) onDeleted(Lead._id);
  };

  return (
    <div
      onClick={() => navigate(`/Leads/${Lead._id}`)}
      style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'box-shadow 0.15s ease'
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{Lead.name}</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaBuilding size={11} /> {Lead.company}
          </p>
        </div>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          background: `${getStatusColor(Lead.status)}20`,
          color: getStatusColor(Lead.status)
        }}>
          {Lead.status?.charAt(0).toUpperCase() + Lead.status?.slice(1)}
        </span>
      </div>

      {/* Contact info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#475569' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FaEnvelope size={11} /> {Lead.email}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FaPhone size={11} /> {Lead.phone}
        </span>
      </div>

      {/* Live widgets */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <CurrentStage
          LeadId={Lead._id}
          LeadName={Lead.name}
          currentStage={Lead.currentStage}
          onStageMoved={onStageMoved}
        />
        <LatestRemark LeadId={Lead._id} LeadName={Lead.name} />
        <UpcomingReminder LeadId={Lead._id} LeadName={Lead.name} />
      </div>

      {/* Actions */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}
      >
        <button
          onClick={() => navigate(`/Leads/${Lead._id}`)}
          style={{
            flex: 1, padding: '6px 10px', background: '#e0e7ff', color: '#4f46e5',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
          }}
        >
          <FaEye size={11} /> View
        </button>
        <button
          onClick={() => navigate(`/Leads/${Lead._id}/edit`)}
          style={{
            flex: 1, padding: '6px 10px', background: '#dbeafe', color: '#2563eb',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
          }}
        >
          <FaEdit size={11} /> Edit
        </button>
        <button
          onClick={handleDelete}
          style={{
            flex: 1, padding: '6px 10px', background: '#fee2e2', color: '#dc2626',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
          }}
        >
          <FaTrash size={11} /> Delete
        </button>
      </div>
    </div>
  );
};

export default LeadCard;
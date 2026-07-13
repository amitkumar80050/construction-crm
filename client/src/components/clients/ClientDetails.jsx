import React from 'react';
import { FaBuilding, FaEnvelope, FaPhone, FaMapMarkerAlt, FaMoneyBillWave, FaCalendarAlt } from 'react-icons/fa';

const getStatusColor = (status) => {
  switch (status) {
    case 'active': return '#22c55e';
    case 'lead': return '#f59e0b';
    case 'closed': return '#8b5cf6';
    case 'lost': return '#ef4444';
    default: return '#64748b';
  }
};

const ClientDetails = ({ client }) => {
  if (!client) return null;

  const addressParts = [
    client.address?.street,
    client.address?.city,
    client.address?.state,
    client.address?.zipCode
  ].filter(Boolean);

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      padding: '20px',
      display: 'grid',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>{client.name}</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaBuilding size={12} /> {client.company}
          </p>
        </div>
        <span style={{
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          background: `${getStatusColor(client.status)}20`,
          color: getStatusColor(client.status)
        }}>
          {client.status?.charAt(0).toUpperCase() + client.status?.slice(1)}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
          <FaEnvelope color="#16a34a" />
          <span style={{ color: '#334155', fontSize: '14px' }}>{client.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
          <FaPhone color="#dc2626" />
          <span style={{ color: '#334155', fontSize: '14px' }}>{client.phone}</span>
        </div>
        {client.projectValue > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
            <FaMoneyBillWave color="#2563eb" />
            <span style={{ color: '#334155', fontSize: '14px' }}>${client.projectValue.toLocaleString()}</span>
          </div>
        )}
        {addressParts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
            <FaMapMarkerAlt color="#8b5cf6" />
            <span style={{ color: '#334155', fontSize: '14px' }}>{addressParts.join(', ')}</span>
          </div>
        )}
        {client.createdAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
            <FaCalendarAlt color="#64748b" />
            <span style={{ color: '#334155', fontSize: '14px' }}>Added {new Date(client.createdAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {client.notes && (
        <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px' }}>
          <strong style={{ fontSize: '13px', color: '#1e293b' }}>Notes</strong>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{client.notes}</p>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;
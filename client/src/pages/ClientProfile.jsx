import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaStickyNote, FaLayerGroup, FaRegClock, FaBuilding, FaEnvelope, FaPhone, FaUser, FaMapMarkerAlt } from 'react-icons/fa';
import clientService from '../services/clientService';
import remarkService from '../services/remarkService';
import reminderService from '../services/reminderService';

const ClientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedSection = location.state?.section || 'overview';

  const loadClientData = async () => {
    try {
      const response = await clientService.getClient(id);
      setClient(response.data?.data || null);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load client';
      toast.error(message);
      setClient(null);
    }
  };

  const loadRemarks = async () => {
    try {
      const response = await remarkService.getRemarksByClient(id);
      setRemarks(response.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadReminders = async () => {
    try {
      const response = await reminderService.getRemindersByClient(id);
      setReminders(response.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadClientData(), loadRemarks(), loadReminders()]);
      setLoading(false);
    };
    loadAll();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        Loading client details...
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ padding: '24px' }}>
        <button
          onClick={() => navigate('/clients')}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}
        >
          <FaArrowLeft /> Back to Clients
        </button>
        <h1 style={{ color: '#ef4444' }}>Client not found</h1>
        <p style={{ color: '#64748b' }}>The client could not be loaded from the database.</p>
      </div>
    );
  }

  const sectionButtons = [
    { key: 'overview', label: 'Overview' },
    { key: 'stage', label: 'Stage' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'reminders', label: 'Reminders' }
  ];

  const renderSection = () => {
    if (selectedSection === 'stage') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
            <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>Current Stage</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <FaLayerGroup style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '18px', fontWeight: 600 }}>{client.currentStage?.name || 'Unassigned'}</span>
            </div>
            <p style={{ marginTop: '12px', color: '#475569' }}>Track progress and update client stage from here.</p>
          </div>
        </div>
      );
    }

    if (selectedSection === 'remarks') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          {remarks.length > 0 ? (
            remarks.map((remark) => (
              <div key={remark._id || remark.id} style={{ padding: '18px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <FaStickyNote style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{new Date(remark.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: 0, color: '#475569' }}>{remark.content}</p>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', color: '#64748b' }}>
              No remarks recorded yet.
            </div>
          )}
        </div>
      );
    }

    if (selectedSection === 'reminders') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <div key={reminder._id || reminder.id} style={{ padding: '18px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <FaRegClock style={{ color: '#dc2626' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{new Date(reminder.dueDate).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: 0, color: '#475569' }}>{reminder.title}</p>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', color: '#64748b' }}>
              No reminders scheduled.
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '18px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>Client Overview</h2>
          <p style={{ margin: 0, color: '#475569' }}>See the latest stage, remarks, and upcoming reminders for this account.</p>
        </div>

        <div style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ padding: '18px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FaLayerGroup style={{ color: '#2563eb' }} />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Current Stage</h3>
            </div>
            <p style={{ margin: 0, color: '#475569' }}>{client.currentStage?.name || 'No stage assigned'}</p>
          </div>

          <div style={{ padding: '18px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FaStickyNote style={{ color: '#16a34a' }} />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Remarks</h3>
            </div>
            <p style={{ margin: 0, color: '#475569' }}>{remarks.length} remark{remarks.length !== 1 ? 's' : ''}</p>
          </div>

          <div style={{ padding: '18px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FaRegClock style={{ color: '#dc2626' }} />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Reminders</h3>
            </div>
            <p style={{ margin: 0, color: '#475569' }}>{reminders.length} reminder{reminders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <button
        onClick={() => navigate('/clients')}
        style={{
          padding: '8px 16px',
          background: '#f1f5f9',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}
      >
        <FaArrowLeft /> Back to Clients
      </button>

      <div style={{ display: 'grid', gap: '24px' }}>
        <section style={{ display: 'grid', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#0f172a' }}>{client.name}</h1>
              <p style={{ margin: '8px 0 0', color: '#64748b' }}>{client.company}</p>
            </div>
            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, auto))' }}>
              <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaBuilding style={{ color: '#2563eb' }} />
                <span style={{ color: '#0f172a' }}>{client.status.toUpperCase()}</span>
              </div>
              <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaEnvelope style={{ color: '#16a34a' }} />
                <span style={{ color: '#0f172a' }}>{client.email}</span>
              </div>
              <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaPhone style={{ color: '#dc2626' }} />
                <span style={{ color: '#0f172a' }}>{client.phone}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {sectionButtons.map((button) => (
              <button
                key={button.key}
                onClick={() => navigate(`/clients/${client._id}`, { state: { section: button.key } })}
                style={{
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: selectedSection === button.key ? '#2563eb' : 'white',
                  color: selectedSection === button.key ? 'white' : '#0f172a',
                  cursor: 'pointer',
                  fontWeight: selectedSection === button.key ? 600 : 500
                }}
              >
                {button.label}
              </button>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: '18px' }}>
          {renderSection()}
        </section>
      </div>
    </div>
  );
};

export default ClientProfile;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaEye, FaStickyNote, FaRegClock, FaLayerGroup, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import clientService from '../services/clientService';
import LatestRemark from '../components/remarks/LatestRemark';
import CurrentStage from '../components/stages/CurrentStage';
import UpcomingReminder from '../components/reminders/UpcomingReminder';

const Clients = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await clientService.getClients(params);
      setClients(response.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load clients';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchTerm, filterStatus]);

  const deleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return;
    }

    try {
      await clientService.deleteClient(clientId);
      setClients((prev) => prev.filter((client) => client._id !== clientId));
      toast.success('Client deleted successfully!');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete client';
      toast.error(message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'lead': return '#f59e0b';
      case 'closed': return '#8b5cf6';
      case 'lost': return '#ef4444';
      default: return '#64748b';
    }
  };

  const viewClientSection = (clientId, section) => {
    navigate(`/clients/${clientId}`, { state: { section } });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Leads</h1>
          <p style={{ color: '#64748b' }}>Manage your leads relationships</p>
        </div>
        <Link
          to="/clients/new"
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
        >
          <FaPlus /> Add Leads
        </Link>
      </div>

      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          minWidth: '200px'
        }}>
          <FaSearch style={{ color: '#64748b', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              padding: '8px 0',
              fontSize: '14px'
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: 'white',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Status</option>
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Name</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Company</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Email</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Phone</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Stage</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Remarks</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Reminder</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>{client.name}</div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      Assigned to {client.assignedTo?.name || 'Unassigned'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#475569' }}>{client.company}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{client.email}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{client.phone}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      background: `${getStatusColor(client.status)}20`,
                      color: getStatusColor(client.status)
                    }}>
                      {client.status?.charAt(0).toUpperCase() + client.status?.slice(1)}
                    </span>
              </td>
                  <td style={{ padding: '16px' }}>
                    <CurrentStage
                      clientId={client._id}
                      clientName={client.name}
                      currentStage={client.currentStage}
                      onStageMoved={fetchClients}
                    />
                  </td>
                  <td style={{ padding: '16px', minWidth: '180px', maxWidth: '220px' }}>
                    <LatestRemark clientId={client._id} clientName={client.name} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <UpcomingReminder clientId={client._id} clientName={client.name} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/clients/${client._id}`)}
                        style={{
                          padding: '6px 12px',
                          background: '#e0e7ff',
                          color: '#4f46e5',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FaEye size={12} /> View
                      </button>
                      <button
                        onClick={() => navigate(`/clients/${client._id}/edit`)}
                        style={{
                          padding: '6px 12px',
                          background: '#dbeafe',
                          color: '#2563eb',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FaEdit size={12} /> Edit
                      </button>
                      <button
                        onClick={() => deleteClient(client._id)}
                        style={{
                          padding: '6px 12px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FaTrash size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No clients found. <Link to="/clients/new" style={{ color: '#2563eb' }}>Add your first client</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Clients;

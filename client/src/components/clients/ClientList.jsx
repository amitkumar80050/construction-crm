import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import clientService from '../../services/clientService';
import ClientCard from './ClientCard';

const ClientList = ({ searchTerm = '', filterStatus = 'all', limit }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (limit) params.limit = limit;

      const response = await clientService.getClients(params);
      setClients(response.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load clients';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus, limit]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDeleted = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await clientService.deleteClient(clientId);
      setClients((prev) => prev.filter((c) => c._id !== clientId));
      toast.success('Client deleted successfully!');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete client';
      toast.error(message);
    }
  };

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Loading clients...</p>;
  }

  if (clients.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
        No clients found.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '18px'
      }}
    >
      {clients.map((client) => (
        <ClientCard
          key={client._id}
          client={client}
          onDeleted={handleDeleted}
          onStageMoved={fetchClients}
        />
      ))}
    </div>
  );
};

export default ClientList;
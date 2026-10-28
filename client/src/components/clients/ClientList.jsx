import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Leadservice from '../../services/leadService';
import LeadCard from './LeadCard';

const LeadList = ({ searchTerm = '', filterStatus = 'all', limit }) => {
  const [Leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (limit) params.limit = limit;

      const response = await Leadservice.getLeads(params);
      setLeads(response.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load Leads';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus, limit]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDeleted = async (LeadId) => {
    if (!window.confirm('Are you sure you want to delete this Lead?')) return;
    try {
      await Leadservice.deleteLead(LeadId);
      setLeads((prev) => prev.filter((c) => c._id !== LeadId));
      toast.success('leaddeleted successfully!');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete Lead';
      toast.error(message);
    }
  };

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Loading Leads...</p>;
  }

  if (Leads.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
        No Leads found.
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
      {Leads.map((Lead) => (
        <LeadCard
          key={Lead._id}
          Lead={Lead}
          onDeleted={handleDeleted}
          onStageMoved={fetchLeads}
        />
      ))}
    </div>
  );
};

export default LeadList;
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaEye, FaStickyNote, FaRegClock, FaLayerGroup, FaEdit, FaTrash, FaRandom } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import Leadservice from '../services/leadService';
import teamService from '../services/teamService';
import LatestRemark from '../components/remarks/LatestRemark';
import CurrentStage from '../components/stages/CurrentStage';
import UpcomingReminder from '../components/reminders/UpcomingReminder';
import QuickLeadUpload from '../components/leads/QuickLeadUpload';

const Leads = () => {
  const { user } = useAuth();
  const canCreateLeads = ['admin', 'manager'].includes(user?.role);
  const navigate = useNavigate();
  const [distributeModalOpen, setDistributeModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('telecaller');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [availableTeams, setAvailableTeams] = useState([]);
  const [distributing, setDistributing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [Leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (distributeModalOpen) {
      teamService.getTeams().then(res => {
        setAvailableTeams(res.data?.data || []);
      }).catch(() => {});
    }
  }, [distributeModalOpen]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await Leadservice.getLeads(params);
      setLeads(response.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load Leads';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchTerm, filterStatus]);

  const deleteLead = async (LeadId) => {
    if (!window.confirm('Are you sure you want to delete this Lead?')) {
      return;
    }

    try {
      await Leadservice.deleteLead(LeadId);
      setLeads((prev) => prev.filter((item) => item._id !== LeadId));
      toast.success('Lead deleted successfully!');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete Lead';
      toast.error(message);
    }
  };
  const deletelead = deleteLead;

  const handleDistributeSubmit = async (e) => {
    e.preventDefault();
    try {
      setDistributing(true);
      const payload = {
        roleFilter: targetRole,
      };
      if (selectedTeam) {
        payload.teamId = selectedTeam;
      }
      const res = await Leadservice.distributeLeads(payload);
      const data = res?.data || res;
      const count = data.totalDistributed ?? data.distributed ?? 0;
      if (count === 0) toast.info(data.message || 'No unassigned leads to distribute.');
      else toast.success(data.message || `Leads successfully distributed round-robin! (${count} distributed)`);
      setDistributeModalOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to distribute leads');
    } finally {
      setDistributing(false);
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

  const viewLeadsection = (LeadId, section) => {
    navigate(`/Leads/${LeadId}`, { state: { section } });
  };

  const filteredLeads = Leads.filter((lead) => {
    const matchesSearch = (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
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
        <div style={{ display: 'flex', gap: '10px' }}>
          {canCreateLeads && <>
            <QuickLeadUpload onImported={fetchLeads} />
            <Link
              to="/import"
              style={{
                padding: '10px 16px',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              Advanced Import
            </Link>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => setDistributeModalOpen(true)}
                style={{
                  padding: '10px 16px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                <FaRandom /> Distribute Leads
              </button>
            )}
            <Link
              to="/Leads/new"
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
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
            >
              <FaPlus /> Add Leads
            </Link>
          </>}
        </div>
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
              {filteredLeads.map((Lead) => (
                <tr key={Lead._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>{Lead.name}</div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      Assigned to {Lead.assignedTo?.name || 'Unassigned'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#475569' }}>{Lead.company}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{Lead.email}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{Lead.phone}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      background: `${getStatusColor(Lead.status)}20`,
                      color: getStatusColor(Lead.status)
                    }}>
                      {Lead.status?.charAt(0).toUpperCase() + Lead.status?.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <CurrentStage
                      LeadId={Lead._id}
                      LeadName={Lead.name}
                      currentStage={Lead.currentStage}
                      onStageMoved={fetchLeads}
                    />
                  </td>
                  <td style={{ padding: '16px', minWidth: '180px', maxWidth: '220px' }}>
                    <LatestRemark LeadId={Lead._id} LeadName={Lead.name} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <UpcomingReminder LeadId={Lead._id} LeadName={Lead.name} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/Leads/${Lead._id}`)}
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
                        onClick={() => navigate(`/Leads/${Lead._id}/edit`)}
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
                        onClick={() => deleteLead(Lead._id)}
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
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No Leads found. <Link to="/Leads/new" style={{ color: '#2563eb' }}>Add your first Lead</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Round-Robin Lead Distribution Modal */}
      {distributeModalOpen && (
        <div
          onClick={() => setDistributeModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '12px', width: '100%',
              maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaRandom color="#059669" /> Auto-Distribute Leads (Round-Robin)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              Distribute unassigned leads equally across your active team members in a fair, automated round-robin sequence.
            </p>

            <form onSubmit={handleDistributeSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Target Team Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '14px'
                  }}
                >
                  <option value="telecaller">Telecallers (Calling & Qualification)</option>
                  <option value="sales executer">Sales Executives (Site Visits & Closing)</option>
                </select>
              </div>

              {availableTeams.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Target Team (Optional)
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '14px'
                    }}
                  >
                    <option value="">All Teams / Organization-wide</option>
                    {availableTeams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name} {team.code ? `(${team.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                padding: '12px', borderRadius: '8px', marginBottom: '20px',
                fontSize: '12px', color: '#166534'
              }}>
                ℹ️ Each active team member with the selected role will receive an equal batch of unassigned leads.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDistributeModalOpen(false)}
                  disabled={distributing}
                  style={{
                    padding: '8px 16px', background: '#f1f5f9', border: 'none',
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={distributing}
                  style={{
                    padding: '8px 20px', background: '#059669', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: distributing ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <FaRandom /> {distributing ? 'Distributing...' : 'Run Round-Robin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;

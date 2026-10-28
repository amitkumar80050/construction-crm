import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaPlus, FaEdit, FaTrash, FaArrowRight, FaLayerGroup
} from 'react-icons/fa';
import stageService from '../services/stageService';
import Leadservice from '../services/leadService';

const Stages = () => {
  const navigate = useNavigate();
  const [stages, setStages] = useState([]);
  const [Leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedNewStage, setSelectedNewStage] = useState('');
  const [saving, setSaving] = useState(false);

  const [newStage, setNewStage] = useState({
    name: '',
    description: '',
    color: '#2563eb'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stagesRes, LeadsRes] = await Promise.all([
        stageService.getStages(),
        Leadservice.getLeads({ limit: 200 })
      ]);
      setStages(stagesRes.data?.data || []);
      setLeads(LeadsRes.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load stages';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real lead count per stage, computed from actual leaddata
  const getLeadCountForStage = (stageId) => {
    return Leads.filter((c) => String(c.currentStage?._id || c.currentStage) === String(stageId)).length;
  };

  const handleAddStage = async () => {
    if (!newStage.name.trim()) {
      toast.error('Please enter stage name');
      return;
    }

    setSaving(true);
    try {
      await stageService.createStage({
        name: newStage.name.trim(),
        description: newStage.description.trim(),
        color: newStage.color,
        order: stages.length + 1
      });
      toast.success('Stage added successfully!');
      setShowAddModal(false);
      setNewStage({ name: '', description: '', color: '#2563eb' });
      fetchData();
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to add stage';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteStage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this stage?')) return;
    try {
      await stageService.deleteStage(id);
      toast.success('Stage deleted successfully!');
      fetchData();
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete stage (it may still be assigned to leads)';
      toast.error(message);
    }
  };

  const moveLeadToStage = async () => {
    if (!selectedLead || !selectedNewStage) {
      toast.error('Please select a stage');
      return;
    }

    setSaving(true);
    try {
      await stageService.updateLeadstage(selectedLead._id, selectedNewStage);
      const stageName = stages.find((s) => s._id === selectedNewStage)?.name || 'new stage';
      toast.success(`Lead moved to ${stageName} stage!`);
      setShowMoveModal(false);
      setSelectedLead(null);
      setSelectedNewStage('');
      fetchData();
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to move lead';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

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
          <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Stages</h1>
          <p style={{ color: '#64748b' }}>Manage lead journey stages</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaPlus /> Add Stage
        </button>
      </div>

      {/* Stages Pipeline — real data */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Loading stages...</p>
      ) : sortedStages.length === 0 ? (
        <div style={{
          background: 'white', padding: '40px', borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', color: '#94a3b8',
          marginBottom: '30px'
        }}>
          <FaLayerGroup size={32} style={{ marginBottom: '10px' }} />
          <p>No stages yet. Click "Add Stage" to create your pipeline.</p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          padding: '16px 0',
          marginBottom: '30px'
        }}>
          {sortedStages.map((stage) => (
            <div
              key={stage._id}
              style={{
                minWidth: '200px',
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderTop: `4px solid ${stage.color}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: '#1e293b', margin: 0 }}>{stage.name}</h4>
                <span style={{
                  background: `${stage.color}20`,
                  color: stage.color,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {getLeadCountForStage(stage._id)}
                </span>
              </div>
              {stage.description && (
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{stage.description}</p>
              )}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => deleteStage(stage._id)}
                  style={{
                    padding: '4px 10px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <FaTrash size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leads Stage Management — real leaddata */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Leads Stage Management</h3>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading leads...</p>
        ) : Leads.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No leads found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Lead</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Current Stage</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Updated</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Leads.map((Lead) => (
                  <tr key={Lead._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td
                      onClick={() => navigate(`/Leads/${Lead._id}`)}
                      style={{ padding: '12px', fontWeight: '500', cursor: 'pointer' }}
                    >
                      {Lead.name}
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>{Lead.company}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {Lead.currentStage?.name ? (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          background: `${Lead.currentStage.color || '#2563eb'}20`,
                          color: Lead.currentStage.color || '#2563eb'
                        }}>
                          {Lead.currentStage.name}
                        </span>
                      ) : Lead.pipelineStage ? (
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                          background: '#eff6ff', color: '#2563eb', fontWeight: 500
                        }}>
                          {Lead.pipelineStage.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                          background: '#f1f5f9', color: '#64748b'
                        }}>
                          No stage
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      {new Date(Lead.updatedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => {
                          setSelectedLead(Lead);
                          setSelectedNewStage('');
                          setShowMoveModal(true);
                        }}
                        style={{
                          padding: '6px 14px',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <FaArrowRight size={10} /> Move
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Stage Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            maxWidth: '400px', width: '100%'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Add New Stage</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Stage Name *</label>
              <input
                type="text"
                value={newStage.name}
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                placeholder="Enter stage name"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Description</label>
              <input
                type="text"
                value={newStage.description}
                onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                placeholder="Enter description"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Color</label>
              <input
                type="color"
                value={newStage.color}
                onChange={(e) => setNewStage({ ...newStage, color: e.target.value })}
                style={{ width: '100%', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '8px', height: '40px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddStage}
                disabled={saving}
                style={{
                  padding: '10px 20px', background: saving ? '#93c5fd' : '#2563eb', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Adding...' : 'Add Stage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Lead Modal */}
      {showMoveModal && selectedLead && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            maxWidth: '400px', width: '100%'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Move Lead to Stage</h2>
            <p style={{ marginBottom: '8px' }}>Lead: <strong>{selectedLead.name}</strong></p>
            <p style={{ marginBottom: '16px' }}>
              Current Stage: <strong>{selectedLead.currentStage?.name || 'No stage'}</strong>
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>New Stage</label>
              <select
                value={selectedNewStage}
                onChange={(e) => setSelectedNewStage(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              >
                <option value="">Select stage...</option>
                {stages.map((stage) => (
                  <option
                    key={stage._id}
                    value={stage._id}
                    disabled={stage._id === selectedLead.currentStage?._id}
                  >
                    {stage.name}{stage._id === selectedLead.currentStage?._id ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedLead(null);
                  setSelectedNewStage('');
                }}
                style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={moveLeadToStage}
                disabled={saving}
                style={{
                  padding: '10px 20px', background: saving ? '#93c5fd' : '#2563eb', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Moving...' : 'Move Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stages;
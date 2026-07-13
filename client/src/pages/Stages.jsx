import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaEdit, FaTrash, FaArrowRight, 
  FaCheckCircle, FaCircle, FaClock 
} from 'react-icons/fa';

const Stages = () => {
  const [stages, setStages] = useState([
    { id: 1, name: 'Lead', description: 'Initial contact', order: 1, color: '#f59e0b', leads: 5 },
    { id: 2, name: 'Contacted', description: 'Contacted lead', order: 2, color: '#2563eb', leads: 3 },
    { id: 3, name: 'Interested', description: 'Interested lead', order: 3, color: '#8b5cf6', leads: 2 },
    { id: 4, name: 'Negotiation', description: 'Negotiating terms', order: 4, color: '#ec4899', leads: 1 },
    { id: 5, name: 'Closed', description: 'Deal closed', order: 5, color: '#22c55e', leads: 3 }
  ]);

  const [clientStages, setClientStages] = useState([
    { id: 1, client: 'ABC Construction', stage: 'Proposal', updated: '2024-01-15' },
    { id: 2, client: 'XYZ Builders', stage: 'Lead', updated: '2024-01-14' },
    { id: 3, client: 'PQR Developers', stage: 'Closed', updated: '2024-01-12' },
    { id: 4, client: 'LMN Infrastructure', stage: 'Qualified', updated: '2024-01-16' }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newStage, setNewStage] = useState({
    name: '',
    description: '',
    color: '#2563eb'
  });

  const handleAddStage = () => {
    if (!newStage.name) {
      toast.error('Please enter stage name');
      return;
    }

    const stage = {
      id: stages.length + 1,
      ...newStage,
      order: stages.length + 1,
      leads: 0
    };

    setStages([...stages, stage]);
    setShowAddModal(false);
    setNewStage({ name: '', description: '', color: '#2563eb' });
    toast.success('Stage added successfully!');
  };

  const deleteStage = (id) => {
    if (window.confirm('Are you sure you want to delete this stage?')) {
      setStages(stages.filter(s => s.id !== id));
      toast.success('Stage deleted successfully!');
    }
  };

  const moveClientToStage = () => {
    if (selectedClient && selectedClient.newStage) {
      setClientStages(clientStages.map(c => 
        c.id === selectedClient.id 
          ? { ...c, stage: selectedClient.newStage, updated: new Date().toISOString().split('T')[0] }
          : c
      ));
      toast.success(`Client moved to ${selectedClient.newStage} stage!`);
      setShowMoveModal(false);
      setSelectedClient(null);
    }
  };

  const getStageColor = (stageName) => {
    const stage = stages.find(s => s.name === stageName);
    return stage ? stage.color : '#64748b';
  };

  const getStageIcon = (stageName) => {
    const index = stages.findIndex(s => s.name === stageName);
    const total = stages.length;
    if (index === total - 1) return <FaCheckCircle color="#22c55e" />;
    if (index === 0) return <FaCircle color="#f59e0b" />;
    return <FaClock color="#2563eb" />;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Stages</h1>
          <p style={{ color: '#64748b' }}>Manage client journey stages</p>
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

      {/* Stages Pipeline */}
      <div style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        padding: '16px 0',
        marginBottom: '30px'
      }}>
        {stages.sort((a, b) => a.order - b.order).map((stage) => (
          <div
            key={stage.id}
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
              <h4 style={{ color: '#1e293b' }}>{stage.name}</h4>
              <span style={{ 
                background: `${stage.color}20`,
                color: stage.color,
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '12px'
              }}>
                {stage.leads}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{stage.description}</p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button
                style={{
                  padding: '4px 10px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                <FaEdit size={10} />
              </button>
              <button
                onClick={() => deleteStage(stage.id)}
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

      {/* Client Stage Management */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Leads Stage Management</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Leads</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Current Stage</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Updated</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clientStages.map((client) => (
                <tr key={client.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{client.client}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      background: `${getStageColor(client.stage)}20`,
                      color: getStageColor(client.stage)
                    }}>
                      {client.stage}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{client.updated}</td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => {
                        setSelectedClient(client);
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
      </div>

      {/* Add Stage Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Add New Stage</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Stage Name *</label>
              <input
                type="text"
                value={newStage.name}
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                placeholder="Enter stage name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Description</label>
              <input
                type="text"
                value={newStage.description}
                onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                placeholder="Enter description"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Color</label>
              <input
                type="color"
                value={newStage.color}
                onChange={(e) => setNewStage({ ...newStage, color: e.target.value })}
                style={{
                  width: '100%',
                  padding: '4px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  height: '40px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddStage}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Add Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move lead Modal */}
      {showMoveModal && selectedClient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Move Lead to Stage</h2>
            <p style={{ marginBottom: '16px' }}>Lead: <strong>{selectedClient.client}</strong></p>
            <p style={{ marginBottom: '16px' }}>Current Stage: <strong>{selectedClient.stage}</strong></p>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>New Stage</label>
              <select
                value={selectedClient.newStage || ''}
                onChange={(e) => setSelectedClient({ ...selectedClient, newStage: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              >
                <option value="">Select stage...</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.name}>{stage.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedClient(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={moveClientToStage}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Move Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stages;
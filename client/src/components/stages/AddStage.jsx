import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaArrowRight, FaTimes } from 'react-icons/fa';
import stageService from '../../services/stageService';

const AddStage = ({ clientId, currentStageId, onMoved, onCancel }) => {
  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [loadingStages, setLoadingStages] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await stageService.getStages();
         console.log('Stages response:', res.data); // ← add this
        setStages(res.data?.data || []);
      } catch (error) {
        console.error('Stage fetch error:', error); // ← add this
        toast.error('Failed to load stages');
      } finally {
        setLoadingStages(false);
      }
    };
    fetchStages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStage) {
      toast.error('Please select a stage');
      return;
    }

    setSubmitting(true);
    try {
      const res = await stageService.updateClientStage(clientId, selectedStage);
      const updatedClient = res.data?.data || res.data;

      toast.success('Lead moved to new stage!');
      setSelectedStage('');

      if (onMoved) onMoved(updatedClient);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update stage';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ color: '#1e293b', fontSize: '14px' }}>Move to Stage</strong>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <FaTimes />
          </button>
        )}
      </div>

      <select
        value={selectedStage}
        onChange={(e) => setSelectedStage(e.target.value)}
        disabled={loadingStages}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '12px'
        }}
      >
        <option value="">
          {loadingStages ? 'Loading stages...' : 'Select stage...'}
        </option>
        {stages.map((stage) => (
          <option
            key={stage._id}
            value={stage._id}
            disabled={stage._id === currentStageId}
          >
            {stage.name}{stage._id === currentStageId ? ' (current)' : ''}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || loadingStages}
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaArrowRight size={12} /> {submitting ? 'Moving...' : 'Move Lead'}
        </button>
      </div>
    </form>
  );
};

export default AddStage;
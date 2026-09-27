import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaArrowRight, FaTimes, FaCalendarAlt, FaStickyNote } from 'react-icons/fa';
import stageService from '../../services/stageService';

const AddStage = ({ clientId, currentStageId, onMoved, onCancel }) => {
  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [loadingStages, setLoadingStages] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await stageService.getStages();
        setStages(res.data?.data || []);
      } catch (error) {
        toast.error('Failed to load stages');
      } finally {
        setLoadingStages(false);
      }
    };
    fetchStages();
  }, []);

  const selectedStageObj = stages.find((s) => s._id === selectedStage);
  const selectedStageName = selectedStageObj?.name?.toLowerCase() || '';
  const isFollowUpOrInterested =
    selectedStageName.includes('follow') ||
    selectedStageName.includes('interest') ||
    selectedStageName.includes('connected');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStage) {
      toast.error('Please select a stage');
      return;
    }

    if (isFollowUpOrInterested && !notes.trim()) {
      toast.error(`Outcome remarks/notes are required when moving to ${selectedStageObj.name}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await stageService.updateClientStage(clientId, {
        stageId: selectedStage,
        notes: notes.trim(),
        followUpDate: followUpDate || undefined,
      });
      const updatedClient = res.data?.data || res.data;

      toast.success(`Lead moved to ${selectedStageObj?.name || 'new stage'}!`);
      setSelectedStage('');
      setNotes('');
      setFollowUpDate('');

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
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ color: '#1e293b', fontSize: '14px' }}>Move to Pipeline Stage</strong>
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

      <div style={{ marginBottom: '12px' }}>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          disabled={loadingStages}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
          }}
          required
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
              {stage.name} {stage._id === currentStageId ? '(Current)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Notes / Remarks Field */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
          <FaStickyNote size={12} /> Call Outcome / Remarks {isFollowUpOrInterested ? '*' : '(Optional)'}
        </label>
        <textarea
          rows="2"
          placeholder="e.g. Spoke with client, requested quote, agreed to meet next week..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required={isFollowUpOrInterested}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Follow-up Date if stage is Follow-up */}
      {selectedStageName.includes('follow') && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            <FaCalendarAlt size={12} /> Next Contact / Follow-up Date
          </label>
          <input
            type="datetime-local"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          />
        </div>
      )}

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
              cursor: 'pointer',
              fontSize: '13px',
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
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <FaArrowRight size={12} /> {submitting ? 'Updating...' : 'Move Lead'}
        </button>
      </div>
    </form>
  );
};

export default AddStage;
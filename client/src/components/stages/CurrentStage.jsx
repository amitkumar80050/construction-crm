import React, { useState } from 'react';
import { FaLayerGroup } from 'react-icons/fa';
import StageTimeline from './StageTimeline';

const CurrentStage = ({ clientId, clientName, currentStage, onStageMoved }) => {
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [stage, setStage] = useState(currentStage);

  const handleClick = (e) => {
    e.stopPropagation();
    setTimelineOpen(true);
  };

  const handleClose = () => setTimelineOpen(false);

  const handleStageMoved = (updatedClient) => {
    if (updatedClient?.currentStage) {
      setStage(updatedClient.currentStage);
    }
    if (onStageMoved) onStageMoved(updatedClient);
  };

  const color = stage?.color || '#64748b';

  return (
    <>
      <button
        onClick={handleClick}
        title="View stage timeline"
        style={{
          padding: '8px 14px',
          border: `1px solid ${color}40`,
          borderRadius: '8px',
          background: `${color}15`,
          color: color,
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <FaLayerGroup size={12} /> {stage?.name || 'No stage'}
      </button>

      <StageTimeline
        clientId={clientId}
        clientName={clientName}
        currentStage={stage}
        isOpen={timelineOpen}
        onClose={handleClose}
        onStageMoved={handleStageMoved}
      />
    </>
  );
};

export default CurrentStage;
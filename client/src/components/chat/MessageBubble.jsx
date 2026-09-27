import React from 'react';

const MessageBubble = ({ message, isOwn }) => {
  const time = message?.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          background: isOwn ? '#dbeafe' : '#f8fafc',
          color: '#0f172a',
          borderRadius: 14,
          padding: '10px 12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 10px rgba(15,23,42,0.04)',
        }}
      >
        {!isOwn && (
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            {message?.senderName || 'Team member'}
          </div>
        )}

        <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{message?.message || ''}</div>

        {time && (
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, textAlign: isOwn ? 'right' : 'left' }}>
            {time}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;

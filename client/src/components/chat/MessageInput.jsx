import React from 'react';

const MessageInput = ({ value, onChange, onSend, disabled, placeholder = 'Type a message...' }) => {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1,
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px solid #cbd5e1',
          outline: 'none',
          fontSize: 14,
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
      />

      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        style={{
          border: 'none',
          borderRadius: 10,
          background: disabled || !value.trim() ? '#cbd5e1' : '#2563eb',
          color: '#fff',
          padding: '12px 18px',
          fontWeight: 700,
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;

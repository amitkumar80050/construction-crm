import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FaComments, FaUserFriends } from 'react-icons/fa';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const ChatPanel = ({ channels = [], selectedChannelId, onSelectChannel, messages = [], user, onSendMessage, loading = false }) => {
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChannelId]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel._id === selectedChannelId) || channels[0] || null,
    [channels, selectedChannelId]
  );

  const handleSend = () => {
    if (!draft.trim() || !selectedChannel) return;
    onSendMessage(selectedChannel._id, draft.trim());
    setDraft('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', minHeight: 560, background: '#fff', borderRadius: 18, boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)', overflow: 'hidden' }}>
      <aside style={{ background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaComments color="#1d4ed8" />
          </div>
          <strong style={{ color: '#1e293b' }}>Chat</strong>
        </div>

        {channels.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>No channels yet.</div>
        ) : (
          channels.map((channel) => (
            <button
              key={channel._id}
              type="button"
              onClick={() => onSelectChannel(channel._id)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                background: selectedChannelId === channel._id ? '#dbeafe' : '#fff',
                marginBottom: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaUserFriends size={12} color="#475569" />
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{channel.name || 'Channel'}</span>
              </span>
            </button>
          ))
        )}
      </aside>

      <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
          <strong style={{ color: '#1e293b' }}>{selectedChannel ? `# ${selectedChannel.name}` : 'Select a channel'}</strong>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f8fafc' }}>
          {loading ? (
            <div style={{ color: '#64748b', fontSize: 14 }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 14 }}>No messages yet in this channel.</div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message._id || `${message.sender}-${message.createdAt}`}
                message={message}
                isOwn={String(message.sender) === String(user?._id || user?.id)}
              />
            ))
          )}
          <div ref={scrollRef} />
        </div>

        <div style={{ padding: 16, background: '#fff' }}>
          <MessageInput value={draft} onChange={setDraft} onSend={handleSend} disabled={!selectedChannel} placeholder={selectedChannel ? 'Type a message...' : 'Select a channel'} />
        </div>
      </section>
    </div>
  );
};

export default ChatPanel;

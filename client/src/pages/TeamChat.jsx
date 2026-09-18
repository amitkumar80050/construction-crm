import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

const TeamChat = () => {
  const { teamId } = useParams();
  const socketRef = useSocket();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/teams/${teamId}/channels`).then((res) => {
      setChannels(res.data.data);
      if (res.data.data[0]) setActiveChannel(res.data.data[0]);
    });
  }, [teamId]);

  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('team:join', teamId);
    socketRef.current.on('message:new', (msg) => {
      if (msg.channel === activeChannel?._id) setMessages((prev) => [...prev, msg]);
    });
  }, [socketRef, teamId, activeChannel]);

  useEffect(() => {
    if (!activeChannel) return;
    api.get(`/teams/channels/${activeChannel._id}/messages`).then((res) => setMessages(res.data.data));
  }, [activeChannel]);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [messages]);

  const send = () => {
    if (!text.trim() || !activeChannel) return;
    socketRef.current.emit('message:send', { channelId: activeChannel._id, message: text.trim() });
    setText('');
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', padding: '24px', gap: '16px' }}>
      <div style={{ width: '200px', background: 'white', borderRadius: '12px', padding: '12px' }}>
        {channels.map((c) => (
          <div key={c._id} onClick={() => setActiveChannel(c)} style={{ padding: '10px', borderRadius: '8px', cursor: 'pointer', background: activeChannel?._id === c._id ? '#dbeafe' : 'transparent' }}>
            # {c.name}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, background: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {messages.map((m) => (
            <div key={m._id} style={{ marginBottom: '10px' }}>
              <strong>{m.senderName}: </strong>{m.message}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid #f1f5f9' }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} placeholder="Type a message..." />
          <button onClick={send} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default TeamChat;
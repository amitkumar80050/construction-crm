import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaComments, FaSearch, FaUserFriends } from 'react-icons/fa';
import api from '../services/api';
import teamService from '../services/teamService';
import { useSocket } from '../hooks/useSocket';

const TeamChat = () => {
  const { teamId } = useParams();
  const socketRef = useSocket();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadChannels = async () => {
    try {
      const res = await api.get(`/teams/${teamId}/channels`);
      const nextChannels = res.data.data || [];
      setChannels(nextChannels);
      if (!activeChannel && nextChannels[0]) {
        setActiveChannel(nextChannels[0]);
      } else if (activeChannel) {
        const exists = nextChannels.some((channel) => channel._id === activeChannel._id);
        if (!exists) setActiveChannel(nextChannels[0] || null);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load team channels');
    }
  };

  useEffect(() => {
    const loadTeam = async () => {
      try {
        setLoading(true);
        const res = await teamService.getTeam(teamId);
        const teamData = res.data.data || {};
        setTeam(teamData);
        setMembers(teamData.members || []);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Unable to load team details');
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      loadTeam();
      loadChannels();
    }
  }, [teamId]);

  useEffect(() => {
    if (!activeChannel) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/teams/channels/${activeChannel._id}/messages`);
        setMessages(res.data.data || []);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Unable to load messages');
      }
    };

    fetchMessages();
  }, [activeChannel]);

  useEffect(() => {
    if (!socketRef.current || !teamId) return;

    socketRef.current.emit('team:join', teamId);
    const handleIncomingMessage = (msg) => {
      if (msg.channel === activeChannel?._id) {
        setMessages((prev) => {
          const exists = prev.some((message) => message._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    };

    socketRef.current.on('message:new', handleIncomingMessage);

    return () => {
      socketRef.current?.off('message:new', handleIncomingMessage);
    };
  }, [socketRef, teamId, activeChannel?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      const text = `${member.name} ${member.email} ${member.role}`.toLowerCase();
      return !query || text.includes(query);
    });
  }, [members, memberSearch]);

  const filteredChannels = useMemo(() => {
    const query = channelSearch.trim().toLowerCase();
    return channels.filter((channel) => !query || channel.name.toLowerCase().includes(query));
  }, [channels, channelSearch]);

  const formatMessageTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (value) => {
    if (!value) return 'TM';
    return value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'TM';
  };

  const createChannel = async () => {
    const channelName = newChannelName.trim();
    if (!channelName) return;

    try {
      await api.post(`/teams/${teamId}/channels`, { name: channelName });
      setNewChannelName('');
      await loadChannels();
      toast.success('Channel created');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to create channel');
    }
  };

  const send = () => {
    if (!text.trim() || !activeChannel || !socketRef.current) return;
    socketRef.current.emit('message:send', { channelId: activeChannel._id, message: text.trim() });
    setText('');
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading team workspace...</div>;
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '18px', background: 'white', borderRadius: '18px', padding: '18px 22px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' }}>
            <FaComments size={20} color="#1d4ed8" />
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#1e293b', fontSize: '28px' }}>{team?.name || 'Team Workspace'}</h1>
            <p style={{ color: '#64748b', margin: '6px 0 0' }}>Internal communication for connected team members only.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 230px', gap: '16px', height: 'calc(100vh - 200px)', minHeight: '600px' }}>
        <div style={{ background: 'white', borderRadius: '18px', padding: '14px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)', overflow: 'hidden' }}>
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '16px' }}>Channels</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', borderRadius: '10px', padding: '8px 10px', border: '1px solid #e2e8f0' }}>
              <FaSearch size={12} color="#64748b" />
              <input
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                placeholder="Search channels"
                style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '13px', color: '#0f172a' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {filteredChannels.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>No channels found</div>
            ) : (
              filteredChannels.map((channel) => (
                <button
                  key={channel._id}
                  onClick={() => setActiveChannel(channel)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer', background: activeChannel?._id === channel._id ? '#dbeafe' : '#f8fafc', color: '#1e293b', fontWeight: activeChannel?._id === channel._id ? 700 : 500
                  }}
                >
                  # {channel.name}
                </button>
              ))
            )}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createChannel()}
              placeholder="New channel name"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', outline: 'none' }}
            />
            <button onClick={createChannel} style={{ width: '100%', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontWeight: 600 }}>
              Create channel
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '18px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#1e293b', background: '#f8fafc' }}>
            {activeChannel ? `# ${activeChannel.name}` : 'Select a channel'}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            {messages.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '24px' }}>No messages yet. Start the conversation.</div>
            ) : (
              messages.map((m) => (
                <div key={m._id || `${m.sender}-${m.createdAt}`} style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingLeft: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                      {getInitials(m.senderName || 'Team member')}
                    </div>
                    <strong style={{ color: '#1e293b', fontSize: '12px' }}>{m.senderName || 'Team member'}</strong>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>{formatMessageTime(m.createdAt)}</span>
                  </div>
                  <div style={{ display: 'inline-block', background: '#ffffff', padding: '10px 12px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', maxWidth: '75%', wordBreak: 'break-word', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                    {m.message}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid #f1f5f9', background: 'white' }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={activeChannel ? 'Type a message...' : 'Select a channel to chat'}
              disabled={!activeChannel}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: activeChannel ? 'white' : '#f1f5f9', outline: 'none' }}
            />
            <button onClick={send} disabled={!activeChannel || !text.trim()} style={{ padding: '10px 18px', background: activeChannel && text.trim() ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#cbd5e1', color: 'white', border: 'none', borderRadius: '10px', cursor: activeChannel && text.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
              Send
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '18px', padding: '14px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUserFriends size={14} color="#2563eb" />
            </div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>Members</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
            <FaSearch size={12} color="#64748b" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members"
              style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '13px', color: '#0f172a' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredMembers.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>No members match your search.</div>
            ) : (
              filteredMembers.map((member) => (
                <div key={member._id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>{member.name}</div>
                  <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{member.email}</div>
                  <div style={{ color: '#2563eb', fontSize: '11px', textTransform: 'capitalize', marginTop: '6px', fontWeight: 600 }}>{member.role}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamChat;
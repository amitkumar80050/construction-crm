import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaComments,
  FaSearch,
  FaUserFriends,
  FaArrowLeft,
  FaPaperPlane,
  FaHashtag,
  FaPlus,
  FaCrown,
  FaBriefcase,
  FaHeadset,
  FaShieldAlt,
  FaUserCheck,
  FaSyncAlt
} from 'react-icons/fa';
import api from '../services/api';
import teamService from '../services/teamService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

const getInitials = (value) => {
  if (!value) return 'TM';
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'TM';
};

const formatRoleBadge = (role) => {
  switch (role) {
    case 'manager':
      return { label: 'Manager', bg: '#f3e8ff', color: '#7e22ce', icon: FaCrown };
    case 'telecaller':
      return { label: 'Telecaller', bg: '#dbeafe', color: '#1d4ed8', icon: FaHeadset };
    case 'sales executer':
    case 'sales executive':
      return { label: 'Sales Exec', bg: '#dcfce7', color: '#15803d', icon: FaBriefcase };
    case 'admin':
      return { label: 'Admin', bg: '#fee2e2', color: '#b91c1c', icon: FaShieldAlt };
    default:
      return { label: role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member', bg: '#f1f5f9', color: '#475569', icon: FaUserCheck };
  }
};

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TeamChat = () => {
  const { teamId } = useParams();
  const { user } = useAuth();
  const socketRef = useSocket();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadChannels = async (selectChannelId = null) => {
    try {
      const res = await api.get(`/teams/${teamId}/channels`);
      const nextChannels = res.data.data || [];
      setChannels(nextChannels);

      if (selectChannelId) {
        const found = nextChannels.find((c) => String(c._id) === String(selectChannelId));
        if (found) setActiveChannel(found);
      } else if (!activeChannel && nextChannels[0]) {
        setActiveChannel(nextChannels[0]);
      } else if (activeChannel) {
        const exists = nextChannels.find((c) => String(c._id) === String(activeChannel._id));
        if (exists) {
          setActiveChannel(exists);
        } else {
          setActiveChannel(nextChannels[0] || null);
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load team channels');
    }
  };

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

  useEffect(() => {
    if (teamId) {
      loadTeam();
      loadChannels();
    }
  }, [teamId]);

  // Fetch messages when active channel changes
  const fetchMessages = async () => {
    if (!activeChannel?._id) return;
    try {
      const res = await api.get(`/teams/channels/${activeChannel._id}/messages`);
      setMessages(res.data.data || []);
    } catch (error) {
      // Ignore background refresh errors
    }
  };

  useEffect(() => {
    if (activeChannel?._id) {
      fetchMessages();
    }
  }, [activeChannel?._id]);

  // Background polling for reliable real-time sync
  useEffect(() => {
    if (!activeChannel?._id) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/teams/channels/${activeChannel._id}/messages`);
        const incoming = res.data.data || [];
        setMessages((prev) => {
          if (incoming.length !== prev.length || (incoming[incoming.length - 1]?._id !== prev[prev.length - 1]?._id)) {
            return incoming;
          }
          return prev;
        });
      } catch (e) {}
    }, 3500);

    return () => clearInterval(interval);
  }, [activeChannel?._id]);

  // Socket.io Realtime Listener
  useEffect(() => {
    if (!socketRef.current || !teamId) return;

    const socket = socketRef.current;
    socket.emit('team:join', teamId);

    const handleConnect = () => {
      socket.emit('team:join', teamId);
    };

    const handleIncomingMessage = (msg) => {
      if (String(msg.channel) === String(activeChannel?._id)) {
        setMessages((prev) => {
          const exists = prev.some((message) => String(message._id) === String(msg._id));
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('connect', handleConnect);
    socket.on('message:new', handleIncomingMessage);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('message:new', handleIncomingMessage);
    };
  }, [socketRef, teamId, activeChannel?._id]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      const t = `${member.name || ''} ${member.email || ''} ${member.role || ''}`.toLowerCase();
      return !query || t.includes(query);
    });
  }, [members, memberSearch]);

  const filteredChannels = useMemo(() => {
    const query = channelSearch.trim().toLowerCase();
    return channels.filter((channel) => !query || channel.name.toLowerCase().includes(query));
  }, [channels, channelSearch]);

  const createChannel = async () => {
    const channelName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!channelName) return;

    try {
      const res = await api.post(`/teams/${teamId}/channels`, { name: channelName });
      setNewChannelName('');
      setShowAddChannel(false);
      toast.success(`Channel #${channelName} created`);
      await loadChannels(res.data?.data?._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to create channel');
    }
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !activeChannel || sending) return;

    setSending(true);
    setText('');

    try {
      const res = await api.post(`/teams/channels/${activeChannel._id}/messages`, { message: trimmed });
      if (res.data?.data) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(res.data.data._id));
          if (exists) return prev;
          return [...prev, res.data.data];
        });
      }

      // Also emit via socket if available
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('message:send', { channelId: activeChannel._id, message: trimmed });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send message');
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <FaSyncAlt className="fa-spin" style={{ marginRight: '8px' }} />
        Loading team workspace...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 28px', background: 'linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)', minHeight: 'calc(100vh - 64px)' }}>
      {/* Top Header Card */}
      <div style={{
        marginBottom: '18px',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '16px 22px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to="/my-team"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#f1f5f9',
              color: '#334155',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid #cbd5e1'
            }}
          >
            <FaArrowLeft size={12} /> Back to My Team
          </Link>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            <FaComments size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: 800 }}>
                {team?.name || 'Team Workspace'}
              </h1>
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#dbeafe', color: '#1d4ed8', fontSize: '11px', fontWeight: 700 }}>
                {team?.code || 'TEAM'}
              </span>
              <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 600 }}>
                {team?.department || 'Operations'}
              </span>
            </div>
            <p style={{ color: '#64748b', margin: '3px 0 0', fontSize: '13px' }}>
              Internal team chat & collaboration • Connected as <strong>{user?.name || 'Member'}</strong> ({user?.role || 'Sales Exec'})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#15803d',
            fontWeight: 700,
            background: '#ecfdf5',
            padding: '6px 14px',
            borderRadius: '999px',
            border: '1px solid #bbf7d0'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
            Internal Chat Active
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px minmax(0, 1fr) 260px',
        gap: '16px',
        height: 'calc(100vh - 190px)',
        minHeight: '560px'
      }}>
        {/* Left Column: Channels */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaHashtag size={13} color="#2563eb" /> Channels ({channels.length})
            </h3>
            <button
              onClick={() => setShowAddChannel(!showAddChannel)}
              title="Add Channel"
              style={{
                background: showAddChannel ? '#fee2e2' : '#f1f5f9',
                color: showAddChannel ? '#b91c1c' : '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FaPlus size={10} /> {showAddChannel ? 'Cancel' : 'New'}
            </button>
          </div>

          {/* Search channels */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            borderRadius: '10px',
            padding: '8px 10px',
            border: '1px solid #e2e8f0',
            marginBottom: '12px'
          }}>
            <FaSearch size={11} color="#94a3b8" />
            <input
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              placeholder="Filter channels..."
              style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '12px', color: '#0f172a' }}
            />
          </div>

          {/* New Channel Form */}
          {showAddChannel && (
            <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
              <input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createChannel()}
                placeholder="channel-name (e.g. field-sales)"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={createChannel}
                disabled={!newChannelName.trim()}
                style={{
                  width: '100%',
                  background: newChannelName.trim() ? '#2563eb' : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: newChannelName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create Channel
              </button>
            </div>
          )}

          {/* Channels List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
            {filteredChannels.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
                No channels found
              </div>
            ) : (
              filteredChannels.map((channel) => {
                const isActive = activeChannel?._id === channel._id;
                return (
                  <button
                    key={channel._id}
                    onClick={() => setActiveChannel(channel)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? '#dbeafe' : '#f8fafc',
                      color: isActive ? '#1d4ed8' : '#334155',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ color: isActive ? '#1d4ed8' : '#94a3b8', fontWeight: 800 }}>#</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {channel.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Messages & Input */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Channel Header */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', color: '#2563eb', fontWeight: 800 }}>#</span>
              <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                {activeChannel ? activeChannel.name : 'Select a channel'}
              </strong>
              {activeChannel?.description && (
                <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px' }}>
                  — {activeChannel.description}
                </span>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {messages.length} message{messages.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Messages Stream */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                margin: 'auto',
                color: '#64748b',
                padding: '24px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px dashed #cbd5e1',
                maxWidth: '380px'
              }}>
                <FaComments size={32} color="#94a3b8" style={{ marginBottom: '10px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No messages in #{activeChannel?.name || 'this channel'}</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Be the first to say hello and collaborate with your team!
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const currentUserId = String(user?._id || user?.id || '');
                const senderId = String(m.sender?._id || m.sender || '');
                const isMine = (currentUserId && senderId && currentUserId === senderId) ||
                               (m.senderName && user?.name && m.senderName.trim().toLowerCase() === user.name.trim().toLowerCase());

                return (
                  <div
                    key={m._id || `${senderId}-${m.createdAt}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start',
                      width: '100%'
                    }}
                  >
                    {/* Sender Info Line */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                      paddingLeft: isMine ? 0 : '4px',
                      paddingRight: isMine ? '4px' : 0
                    }}>
                      {!isMine && (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700
                        }}>
                          {getInitials(m.senderName || 'TM')}
                        </div>
                      )}
                      <strong style={{ fontSize: '12px', color: isMine ? '#2563eb' : '#334155' }}>
                        {isMine ? 'You' : (m.senderName || 'Team Member')}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {formatMessageTime(m.createdAt)}
                      </span>
                    </div>

                    {/* Message Bubble */}
                    <div style={{
                      padding: '11px 16px',
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMine ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#ffffff',
                      color: isMine ? '#ffffff' : '#0f172a',
                      maxWidth: '75%',
                      wordBreak: 'break-word',
                      boxShadow: isMine ? '0 4px 14px rgba(37, 99, 235, 0.2)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
                      border: isMine ? 'none' : '1px solid #e2e8f0',
                      fontSize: '14px',
                      lineHeight: '1.45'
                    }}>
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Message Input Box */}
          <div style={{
            padding: '14px 18px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={activeChannel ? `Message #${activeChannel.name}... (Press Enter to send)` : 'Select a channel...'}
              disabled={!activeChannel || sending}
              style={{
                flex: 1,
                padding: '11px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                background: activeChannel ? '#f8fafc' : '#f1f5f9',
                outline: 'none',
                fontSize: '14px',
                color: '#0f172a'
              }}
            />
            <button
              onClick={send}
              disabled={!activeChannel || !text.trim() || sending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 22px',
                background: activeChannel && text.trim() && !sending ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                cursor: activeChannel && text.trim() && !sending ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: activeChannel && text.trim() && !sending ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <FaPaperPlane size={13} /> {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Right Column: Respective Team Members */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUserFriends size={14} color="#2563eb" />
            </div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 700 }}>
              Team Members ({filteredMembers.length})
            </h3>
          </div>

          {/* Search Members */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            padding: '8px 10px',
            borderRadius: '10px',
            marginBottom: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <FaSearch size={11} color="#94a3b8" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: '12px', color: '#0f172a' }}
            />
          </div>

          {/* Members List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
            {filteredMembers.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
                No members found
              </div>
            ) : (
              filteredMembers.map((member) => {
                const badge = formatRoleBadge(member.role);
                const isOnline = member.isActive !== false;
                const isCurrentUser = String(member._id) === String(user?._id || user?.id);

                return (
                  <div
                    key={member._id}
                    style={{
                      padding: '10px 12px',
                      background: isCurrentUser ? '#eff6ff' : '#f8fafc',
                      borderRadius: '12px',
                      border: isCurrentUser ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: badge.bg,
                      color: badge.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {getInitials(member.name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.name} {isCurrentUser && <span style={{ color: '#2563eb', fontSize: '11px' }}>(You)</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: badge.bg,
                          color: badge.color,
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          <badge.icon size={9} /> {badge.label}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: isOnline ? '#16a34a' : '#94a3b8' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#cbd5e1' }} />
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamChat;

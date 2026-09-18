import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaPaperPlane } from 'react-icons/fa';
import whatsappService from '../../services/whatsappService';

const WhatsAppChat = ({ client }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await whatsappService.getMessagesByClient(client._id);
      setMessages(res.data.data);
    } catch (error) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [client._id]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // simple poll for new incoming messages
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await whatsappService.sendMessage(client.phone, text.trim());
      setText('');
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#1e293b' }}>
        WhatsApp — {client.name}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading...</p>
        ) : messages.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m._id} style={{
              alignSelf: m.direction === 'outgoing' ? 'flex-end' : 'flex-start',
              background: m.direction === 'outgoing' ? '#dcf8c6' : '#f1f5f9',
              padding: '8px 12px', borderRadius: '10px', maxWidth: '75%', fontSize: '13px'
            }}>
              {m.body}
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '10px', borderTop: '1px solid #f1f5f9' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />
        <button
          onClick={handleSend}
          disabled={sending}
          style={{ padding: '8px 14px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', cursor: sending ? 'not-allowed' : 'pointer' }}
        >
          <FaPaperPlane size={12} />
        </button>
      </div>
    </div>
  );
};

export default WhatsAppChat;
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaWhatsapp, FaSyncAlt } from 'react-icons/fa';
import whatsappService from '../../services/whatsappService';

const WhatsAppConnectWidget = () => {
  const [status, setStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await whatsappService.getStatus();
      setStatus(res.data.data.status);
      setQr(res.data.data.qr);
    } catch (error) {
      // silent — widget just shows disconnected
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 3000); // poll every 3s while QR is pending / connecting
    return () => clearInterval(interval);
  }, [poll]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await whatsappService.init();
      toast.info('Starting WhatsApp — a QR code will appear shortly.');
    } catch (error) {
      toast.error('Failed to start WhatsApp connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await whatsappService.logout();
      toast.success('WhatsApp disconnected.');
      setStatus('disconnected');
      setQr(null);
    } catch (error) {
      toast.error('Failed to disconnect.');
    }
  };

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <FaWhatsapp size={20} color="#25D366" />
        <h3 style={{ margin: 0, color: '#1e293b' }}>WhatsApp Connection</h3>
      </div>

      {status === 'connected' && (
        <div>
          <p style={{ color: '#16a34a', fontWeight: 600 }}>✅ Connected</p>
          <button onClick={handleDisconnect} style={{ padding: '8px 16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Disconnect
          </button>
        </div>
      )}

      {status === 'qr_pending' && qr && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>
            Scan this QR with WhatsApp on your phone (Linked Devices → Link a Device)
          </p>
          <img src={qr} alt="WhatsApp QR" style={{ width: '220px', height: '220px' }} />
        </div>
      )}

      {(status === 'disconnected' || status === 'auth_failed') && (
        <div>
          {status === 'auth_failed' && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>Authentication failed — try again.</p>
          )}
          <button
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: '10px 18px', background: '#25D366', color: 'white', border: 'none',
              borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
              alignItems: 'center', gap: '8px'
            }}
          >
            {loading ? <FaSyncAlt style={{ animation: 'spin 1s linear infinite' }} /> : <FaWhatsapp />}
            {loading ? 'Starting...' : 'Connect WhatsApp'}
          </button>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConnectWidget;
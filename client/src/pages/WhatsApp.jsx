import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import WhatsAppConnectWidget from '../components/dashboard/WhatsAppConnectWidget';

const WhatsApp = () => (
  <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FaWhatsapp size={28} color="#25D366" />
        <h1 style={{ margin: 0, color: '#1e293b', fontSize: '28px' }}>WhatsApp</h1>
      </div>
      <p style={{ color: '#64748b', margin: '8px 0 0' }}>
        Connect a WhatsApp account by scanning the QR code with Linked Devices.
      </p>
    </div>

    <WhatsAppConnectWidget />
  </div>
);

export default WhatsApp;
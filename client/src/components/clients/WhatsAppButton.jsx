import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppButton = ({ phone, message }) => {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || '')}`;

  return (
    <a href={url} target="_blank" rel="noreferrer" style={{
      padding: '8px 14px', background: '#25D366', color: 'white', borderRadius: '8px',
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px'
    }}>
      <FaWhatsapp /> WhatsApp
    </a>
  );
};

export default WhatsAppButton;
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import leadService from '../../services/leadService';

const LeadForm = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', phone: '', address: '', source: 'call', company: '', email: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.source) {
      toast.error('Name, contact, and source are required');
      return;
    }
    setSaving(true);
    try {
      await leadService.createLead({ ...form, status: 'lead' });
      toast.success('Lead created');
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create lead');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={submit} style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '380px' }}>
        <h3 style={{ marginBottom: '14px' }}>Add Lead</h3>
        <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        <input placeholder="Contact No. *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
        <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} style={inputStyle} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} />
        <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={inputStyle}>
          <option value="call">Call</option>
          <option value="website">Website</option>
          <option value="referral">Referral</option>
          <option value="social_media">Social Media</option>
          <option value="other">Other</option>
        </select>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px' }}>{saving ? 'Saving...' : 'Add Lead'}</button>
        </div>
      </form>
    </div>
  );
};
export default LeadForm;
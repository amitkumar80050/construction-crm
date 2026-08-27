import React, { useState, useEffect } from 'react';
import { FaSave } from 'react-icons/fa';

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'lead',
  projectValue: '',
  notes: '',
  address: '',
  city: '',
  state: '',
  zipCode: ''
};

const ClientForm = ({ initialData, onSubmit, onCancel, saving, submitLabel = 'Save Lead' }) => {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        company: initialData.company || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        status: initialData.status || 'lead',
        projectValue: initialData.projectValue ?? '',
        notes: initialData.notes || '',
        address: initialData.address?.street || '',
        city: initialData.address?.city || '',
        state: initialData.address?.state || '',
        zipCode: initialData.address?.zipCode || ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      status: formData.status,
      projectValue: Number(formData.projectValue) || 0,
      notes: formData.notes,
      address: {
        street: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode
      }
    };
    onSubmit(payload);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px'
  };
  const labelStyle = { display: 'block', marginBottom: '6px', color: '#1e293b', fontWeight: '500' };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={labelStyle}>Lead Name *</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Company *</label>
          <input type="text" name="company" value={formData.company} onChange={handleChange} required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Email *</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Phone *</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Project Value (Rs.)</label>
          <input type="number" name="projectValue"  style={inputStyle} />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address"
            style={{ ...inputStyle, marginBottom: '10px' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" style={inputStyle} />
            <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" style={inputStyle} />
            <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="Zip Code" style={inputStyle} />
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="4"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '10px 24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#475569' }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 24px',
            background: saving ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaSave /> {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ClientForm;
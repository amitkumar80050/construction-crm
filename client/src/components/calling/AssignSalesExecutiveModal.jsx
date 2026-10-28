import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaUserCheck, FaCalendarAlt, FaMapMarkerAlt, FaTimes, FaShieldAlt, FaClipboardList } from 'react-icons/fa';
import siteVisitService from '../../services/siteVisitService';
import userService from '../../services/userService';

const AssignSalesExecutiveModal = ({ lead, onClose, onAssigned }) => {
  const [executives, setExecutives] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const defaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(11, 0, 0, 0);
    // Format YYYY-MM-DDTHH:MM
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    executiveId: '',
    scheduledAt: defaultDate(),
    address: lead?.address?.street || lead?.address?.city || lead?.company || 'Main Project Construction Site',
    priority: 'HIGH',
    notes: `AI Confirmed Site Visit: Customer ${lead?.name} requested model flat walkthrough and structural specification briefing.`,
  });

  useEffect(() => {
    const fetchExecutives = async () => {
      try {
        const res = await userService.getUsers();
        const allUsers = res.data?.data || res.data || [];
        const salesExecs = allUsers.filter(u => u.role === 'sales executer' && u.isActive !== false);
        setExecutives(salesExecs);
        if (salesExecs.length > 0) {
          setFormData(prev => ({ ...prev, executiveId: salesExecs[0]._id }));
        }
      } catch (err) {
        console.warn('Could not fetch executives list:', err.message);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchExecutives();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.executiveId) {
      toast.error('Please select an active Field Sales Executive');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('Site address is required');
      return;
    }

    setSubmitting(true);
    try {
      await siteVisitService.createSiteVisit({
        leadId: lead._id || lead.id,
        executiveId: formData.executiveId,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        address: formData.address.trim(),
        priority: formData.priority,
        notes: formData.notes.trim(),
      });

      toast.success(`🎉 Site Visit assigned to Sales Executive successfully!`);
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to assign site visit. Ensure lead is in Site Visit Planned stage.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: 'white',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#10b981',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                Auto-Triggered
              </span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Assign Field Sales Executive</h3>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
              For Lead: <strong>{lead?.name}</strong> ({lead?.phone || 'No Phone'})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px'
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Executive Select */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              <FaUserCheck style={{ marginRight: '6px', color: '#2563eb' }} /> Select Field Sales Executive
            </label>
            {loadingUsers ? (
              <div style={{ padding: '10px', color: '#64748b', fontSize: '13px' }}>Loading sales executives...</div>
            ) : executives.length === 0 ? (
              <div style={{ padding: '10px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px' }}>
                No active users with role "sales executer" found. Please ask Admin/Manager to assign a sales executor user.
              </div>
            ) : (
              <select
                value={formData.executiveId}
                onChange={(e) => setFormData({ ...formData, executiveId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#0f172a',
                  outline: 'none'
                }}
              >
                {executives.map(exec => (
                  <option key={exec._id} value={exec._id}>
                    {exec.name} — ({exec.email} • {exec.phone || 'Sales Exec'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Schedule Date & Time */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              <FaCalendarAlt style={{ marginRight: '6px', color: '#2563eb' }} /> Scheduled Inspection Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none'
              }}
            />
          </div>

          {/* Address */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              <FaMapMarkerAlt style={{ marginRight: '6px', color: '#2563eb' }} /> Site Address / Location
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              placeholder="e.g. Sector 150 Expressway, Tower B"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none'
              }}
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              <FaShieldAlt style={{ marginRight: '6px', color: '#2563eb' }} /> Visit Priority
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setFormData({ ...formData, priority: p })}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: formData.priority === p ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: formData.priority === p ? '#eff6ff' : '#f8fafc',
                    color: formData.priority === p ? '#1d4ed8' : '#475569',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Executive Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              <FaClipboardList style={{ marginRight: '6px', color: '#2563eb' }} /> Field Instructions & Customer Notes
            </label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#475569',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || executives.length === 0}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                fontWeight: 600,
                fontSize: '13px',
                cursor: submitting || executives.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
              }}
            >
              {submitting ? 'Assigning...' : 'Confirm Visit Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignSalesExecutiveModal;

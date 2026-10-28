import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaStickyNote, FaLayerGroup, FaRegClock, FaBuilding,
  FaEnvelope, FaPhone, FaUser, FaMapMarkerAlt, FaWhatsapp, FaPhoneAlt,
  FaPlus, FaCheck, FaTrash, FaEdit, FaRupeeSign, FaCalendarAlt,
  FaHistory, FaExclamationCircle, FaPaperPlane, FaTimes, FaExternalLinkAlt,
  FaTag
} from 'react-icons/fa';
import leadService from '../services/leadService';
import remarkService from '../services/remarkService';
import reminderService from '../services/reminderService';
import whatsappService from '../services/whatsappService';
import AddRemark from '../components/remarks/AddRemark';
import AddReminder from '../components/reminders/AddReminder';
import LeadStageModal from '../components/leads/LeadStageModal';

const PIPELINE_STAGES = [
  { key: 'NEW', label: 'New Lead', color: '#64748b', bg: '#f1f5f9' },
  { key: 'CONNECTED', label: 'Connected', color: '#2563eb', bg: '#eff6ff' },
  { key: 'INTERESTED', label: 'Interested', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'FOLLOW_UP', label: 'Follow Up', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'SITE_VISIT_PLANNED', label: 'Site Visit Planned', color: '#0ea5e9', bg: '#f0f9ff' },
  { key: 'SITE_VISIT_DONE', label: 'Site Visit Done', color: '#10b981', bg: '#ecfdf5' },
  { key: 'QUOTATION', label: 'Quotation', color: '#d97706', bg: '#fffbeb' },
  { key: 'CONVERTED', label: 'Converted', color: '#16a34a', bg: '#dcfce7' },
];

const getRemarkTypeStyle = (type) => {
  switch (type) {
    case 'call': return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: '📞 Call' };
    case 'meeting': return { color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', label: '👥 Meeting' };
    case 'email': return { color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', label: '✉️ Email' };
    case 'follow-up': return { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: '⏰ Follow-up' };
    case 'note': return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: '📝 Note' };
    default: return { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: '💬 Remark' };
  }
};

const getReminderPriorityStyle = (priority) => {
  switch (priority) {
    case 'high': return { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
    case 'medium': return { color: '#d97706', bg: '#fef3c7', border: '#fde68a' };
    case 'low': return { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
    default: return { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
  }
};

const formatCurrency = (val) => {
  if (!val && val !== 0) return 'Not specified';
  const num = Number(val);
  if (isNaN(num)) return val;
  return '₹' + num.toLocaleString('en-IN');
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const LeadProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [lead, setLead] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [stageHistory, setStageHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState(location.state?.section || 'overview');

  // Modals & Forms
  const [showStageModal, setShowStageModal] = useState(false);
  const [showAddRemark, setShowAddRemark] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Filters
  const [remarkFilter, setRemarkFilter] = useState('all');
  const [reminderFilter, setReminderFilter] = useState('all');

  // Quick Note
  const [quickNote, setQuickNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // WhatsApp Tab state
  const [waMessages, setWaMessages] = useState([]);
  const [waText, setWaText] = useState('');
  const [waSending, setWaSending] = useState(false);

  // Edit Lead Form state
  const [editForm, setEditForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    source: 'website',
    status: 'lead',
    projectValue: '',
    notes: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [updatingLead, setUpdatingLead] = useState(false);

  const loadLeadData = useCallback(async () => {
    try {
      const response = await leadService.getLead(id);
      const leadData = response.data?.data?.lead || response.data?.data;
      setLead(leadData || null);
      if (response.data?.data?.history) {
        setStageHistory(response.data.data.history);
      }
      if (leadData) {
        setEditForm({
          name: leadData.name || '',
          company: leadData.company || '',
          email: leadData.email || '',
          phone: leadData.phone || '',
          source: leadData.source || 'website',
          status: leadData.status || 'lead',
          projectValue: leadData.projectValue || '',
          notes: leadData.notes || '',
          address: leadData.address || '',
          city: leadData.city || '',
          state: leadData.state || '',
          zipCode: leadData.zipCode || ''
        });
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load Lead';
      toast.error(message);
      setLead(null);
    }
  }, [id]);

  const loadRemarks = useCallback(async () => {
    try {
      const response = await remarkService.getRemarksByLead(id);
      setRemarks(response.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  const loadReminders = useCallback(async () => {
    try {
      const response = await reminderService.getRemindersByLead(id);
      setReminders(response.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  const loadWhatsAppMessages = useCallback(async () => {
    try {
      const res = await whatsappService.getMessagesByLead(id);
      setWaMessages(res.data?.data || []);
    } catch (error) {
      // Non-fatal
    }
  }, [id]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadLeadData(), loadRemarks(), loadReminders()]);
      setLoading(false);
    };
    loadAll();
  }, [id, loadLeadData, loadRemarks, loadReminders]);

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      loadWhatsAppMessages();
    }
  }, [activeTab, loadWhatsAppMessages]);

  const handleRemarkAdded = (newRemark) => {
    setRemarks((prev) => [newRemark, ...prev]);
    setShowAddRemark(false);
    loadLeadData();
  };

  const handleReminderAdded = (newReminder) => {
    setReminders((prev) => [newReminder, ...prev]);
    setShowAddReminder(false);
  };

  const handleCompleteReminder = async (remId) => {
    try {
      const res = await reminderService.completeReminder(remId);
      const updated = res.data?.data || res.data;
      setReminders((prev) => prev.map((r) => (r._id === remId ? updated : r)));
      toast.success('Reminder marked as completed!');
    } catch (error) {
      toast.error('Failed to update reminder');
    }
  };

  const handleDeleteReminder = async (remId) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await reminderService.deleteReminder(remId);
      setReminders((prev) => prev.filter((r) => r._id !== remId));
      toast.success('Reminder deleted');
    } catch (error) {
      toast.error('Failed to delete reminder');
    }
  };

  const handleDeleteRemark = async (remId) => {
    if (!window.confirm('Delete this remark?')) return;
    try {
      await remarkService.deleteRemark(remId);
      setRemarks((prev) => prev.filter((r) => r._id !== remId));
      toast.success('Remark deleted');
    } catch (error) {
      toast.error('Failed to delete remark');
    }
  };

  const handleSaveQuickNote = async (e) => {
    e.preventDefault();
    if (!quickNote.trim()) return toast.error('Please enter note text');
    setSavingNote(true);
    try {
      const res = await remarkService.createRemark({
        Lead: lead._id,
        content: quickNote.trim(),
        type: 'call',
        visibility: 'public'
      });
      const created = res.data?.data || res.data;
      setRemarks((prev) => [created, ...prev]);
      setQuickNote('');
      toast.success('Call note logged successfully!');
      loadLeadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!waText.trim()) return toast.error('Please enter a message');
    if (!lead?.phone) return toast.error('Lead phone number is missing');
    setWaSending(true);
    try {
      await whatsappService.sendMessage(lead.phone, waText.trim());
      setWaText('');
      toast.success('WhatsApp message sent!');
      loadWhatsAppMessages();
    } catch (err) {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText.trim())}`, '_blank');
      setWaText('');
    } finally {
      setWaSending(false);
    }
  };

  const handleUpdateLeadSubmit = async (e) => {
    e.preventDefault();
    setUpdatingLead(true);
    try {
      const res = await leadService.updateLead(lead._id, editForm);
      const updated = res.data?.data || res.data;
      setLead(updated);
      toast.success('Lead profile updated successfully!');
      setShowEditModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update lead');
    } finally {
      setUpdatingLead(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '40px', height: '40px', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '18px', color: '#1e293b' }}>Loading Lead Profile...</h3>
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/Leads')}
          style={{
            padding: '10px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1',
            borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontWeight: 600
          }}
        >
          <FaArrowLeft /> Back to Leads
        </button>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <FaExclamationCircle size={40} color="#ef4444" style={{ marginBottom: '12px' }} />
          <h2 style={{ color: '#991b1b', margin: '0 0 8px' }}>Lead Not Found</h2>
          <p style={{ color: '#b91c1c', margin: 0 }}>The requested lead record could not be loaded or you may not have permission to view it.</p>
        </div>
      </div>
    );
  }

  const currentStageKey = (lead.pipelineStage || lead.currentStage?.name || 'NEW').toUpperCase().replace(/\s+/g, '_');
  const currentStageInfo = PIPELINE_STAGES.find((s) => s.key === currentStageKey) || PIPELINE_STAGES[0];
  const pendingReminders = reminders.filter((r) => r.status !== 'completed');
  const overdueReminders = pendingReminders.filter((r) => r.dueDate && new Date(r.dueDate) < new Date());
  const initials = lead.name ? lead.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'L';
  const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, '') : '';

  const filteredRemarks = remarks.filter((r) => remarkFilter === 'all' || r.type === remarkFilter);
  const filteredReminders = reminders.filter((r) => {
    if (reminderFilter === 'pending') return r.status === 'pending';
    if (reminderFilter === 'completed') return r.status === 'completed';
    if (reminderFilter === 'overdue') return r.status === 'overdue' || (r.status === 'pending' && new Date(r.dueDate) < new Date());
    return true;
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => navigate('/Leads')}
          style={{
            padding: '8px 16px',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#475569',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <FaArrowLeft size={12} /> Back to Leads
        </button>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {lead.phone && (
            <>
              <a
                href={`tel:${lead.phone}`}
                style={{
                  padding: '8px 14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                  borderRadius: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600
                }}
                title="Call Lead"
              >
                <FaPhoneAlt size={11} /> Call
              </a>

              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 14px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                  borderRadius: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600
                }}
                title="Chat on WhatsApp"
              >
                <FaWhatsapp size={14} /> WhatsApp
              </a>
            </>
          )}

          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              style={{
                padding: '8px 14px', background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff',
                borderRadius: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600
              }}
              title="Send Email"
            >
              <FaEnvelope size={12} /> Email
            </a>
          )}

          <button
            onClick={() => setShowEditModal(true)}
            style={{
              padding: '8px 14px', background: 'white', color: '#334155', border: '1px solid #cbd5e1',
              borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600
            }}
          >
            <FaEdit size={12} /> Edit Lead
          </button>

          <button
            onClick={() => setShowStageModal(true)}
            style={{
              padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none',
              borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600,
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <FaLayerGroup size={12} /> Change Stage
          </button>
        </div>
      </div>

      {/* Hero Profile Header Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Lead Avatar */}
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              boxShadow: '0 8px 16px -4px rgba(37,99,235,0.3)',
              flexShrink: 0
            }}>
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '26px', color: '#0f172a', fontWeight: 700 }}>{lead.name}</h1>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: lead.status === 'closed' ? '#dcfce7' : '#eff6ff',
                  color: lead.status === 'closed' ? '#15803d' : '#2563eb',
                  border: `1px solid ${lead.status === 'closed' ? '#bbf7d0' : '#bfdbfe'}`
                }}>
                  ● {lead.status || 'Active'}
                </span>

                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: currentStageInfo.bg,
                  color: currentStageInfo.color,
                  border: `1px solid ${currentStageInfo.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <FaLayerGroup size={10} /> {currentStageInfo.label}
                </span>
              </div>

              {lead.company && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  <FaBuilding size={12} /> {lead.company}
                </div>
              )}

              {/* Badges / Meta Pills */}
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px', flexWrap: 'wrap', fontSize: '13px', color: '#475569' }}>
                {lead.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FaPhone size={11} color="#64748b" /> {lead.phone}
                  </span>
                )}
                {lead.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FaEnvelope size={11} color="#64748b" /> {lead.email}
                  </span>
                )}
                {(lead.city || lead.state) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FaMapMarkerAlt size={11} color="#64748b" /> {[lead.city, lead.state].filter(Boolean).join(', ')}
                  </span>
                )}
                {lead.source && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FaTag size={10} color="#64748b" /> Source: <strong style={{ color: '#1e293b' }}>{lead.source}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Highlights: Project Value & Assignee */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 18px',
              minWidth: '150px'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Project Value</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <FaRupeeSign size={14} color="#16a34a" /> {lead.projectValue ? Number(lead.projectValue).toLocaleString('en-IN') : '—'}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 18px',
              minWidth: '160px'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Assigned To</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaUser size={11} color="#2563eb" /> {lead.assignedTo?.name || 'Unassigned'}
              </div>
              {lead.team && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Team: {lead.team.name || lead.team.code}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'stage', label: '🔄 Pipeline & Stage' },
          { key: 'remarks', label: `💬 Remarks (${remarks.length})` },
          { key: 'reminders', label: `⏰ Reminders (${pendingReminders.length})` },
          { key: 'whatsapp', label: '💬 WhatsApp' },
          { key: 'details', label: 'ℹ️ Full Details' }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                marginBottom: '-2px'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Top Quick Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Current Stage</span>
                <span style={{ background: currentStageInfo.bg, color: currentStageInfo.color, padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: currentStageInfo.color }}>{currentStageInfo.label}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Last updated: {formatDate(lead.lastContactDate || lead.updatedAt)}
              </div>
            </div>

            <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Remarks & Notes</span>
                <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{remarks.length} total</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{remarks.length} Notes Recorded</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {remarks[0] ? `Latest by ${remarks[0].user?.name || 'User'}` : 'No notes yet'}
              </div>
            </div>

            <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Reminders</span>
                {overdueReminders.length > 0 ? (
                  <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{overdueReminders.length} Overdue</span>
                ) : (
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{pendingReminders.length} Pending</span>
                )}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {pendingReminders.length} Scheduled
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {pendingReminders[0] ? `Next: ${formatDate(pendingReminders[0].dueDate)}` : 'All tasks caught up'}
              </div>
            </div>

            <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Project Value</span>
                <FaRupeeSign size={12} color="#16a34a" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {formatCurrency(lead.projectValue)}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Created: {formatDate(lead.createdAt)}
              </div>
            </div>
          </div>

          {/* 2-Column Main Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '24px', alignItems: 'start' }}>
            {/* Left Column: Quick Notepad & Recent Remarks */}
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Quick Note Card */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaStickyNote color="#2563eb" /> Quick Call / Meeting Note
                  </h3>
                  <button
                    onClick={() => { setActiveTab('remarks'); setShowAddRemark(true); }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Detailed Remark
                  </button>
                </div>
                <form onSubmit={handleSaveQuickNote}>
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="Type client update, conversation takeaways, or next steps..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      marginBottom: '10px'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={savingNote || !quickNote.trim()}
                      style={{
                        padding: '8px 18px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: savingNote || !quickNote.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        opacity: savingNote || !quickNote.trim() ? 0.6 : 1
                      }}
                    >
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Recent Remarks Preview */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Recent Remarks ({remarks.length})</h3>
                  <button
                    onClick={() => setActiveTab('remarks')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    View All →
                  </button>
                </div>

                {remarks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '13px' }}>No remarks recorded for this lead yet.</p>
                    <button
                      onClick={() => { setActiveTab('remarks'); setShowAddRemark(true); }}
                      style={{ padding: '6px 14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      + Add First Remark
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {remarks.slice(0, 3).map((r) => {
                      const style = getRemarkTypeStyle(r.type);
                      return (
                        <div key={r._id} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', borderLeft: `3px solid ${style.color}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, background: style.bg, color: style.color, padding: '2px 8px', borderRadius: '10px' }}>
                              {style.label}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDateTime(r.createdAt)}</span>
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>{r.content}</p>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Added by: {r.user?.name || 'User'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lead Requirements / Notes */}
              {lead.notes && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '18px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#92400e', fontWeight: 700 }}>Initial Requirements & Notes</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>{lead.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column: Pipeline Stepper & Upcoming Reminders */}
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Pipeline Progress Stepper Card */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaLayerGroup color="#2563eb" /> Pipeline Stage
                  </h3>
                  <button
                    onClick={() => setShowStageModal(true)}
                    style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Advance Stage
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {PIPELINE_STAGES.map((s, idx) => {
                    const currentIndex = PIPELINE_STAGES.findIndex((st) => st.key === currentStageKey);
                    const isDone = idx < currentIndex;
                    const isCurrent = idx === currentIndex;
                    return (
                      <div
                        key={s.key}
                        onClick={() => setShowStageModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: isCurrent ? `2px solid ${s.color}` : '1px solid #f1f5f9',
                          background: isCurrent ? s.bg : isDone ? '#f8fafc' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700,
                            background: isDone ? '#16a34a' : isCurrent ? s.color : '#e2e8f0',
                            color: isDone || isCurrent ? 'white' : '#64748b'
                          }}>
                            {isDone ? <FaCheck size={10} /> : idx + 1}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: isCurrent ? 700 : isDone ? 500 : 400, color: isCurrent ? s.color : '#334155' }}>
                            {s.label}
                          </span>
                        </div>
                        {isCurrent && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: s.color, background: 'white', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${s.color}30` }}>
                            Current
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Reminders Card */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaRegClock color="#d97706" /> Reminders ({pendingReminders.length})
                  </h3>
                  <button
                    onClick={() => { setActiveTab('reminders'); setShowAddReminder(true); }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Add New
                  </button>
                </div>

                {pendingReminders.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px 0', fontSize: '13px' }}>
                    No pending reminders scheduled.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendingReminders.slice(0, 3).map((rem) => {
                      const pStyle = getReminderPriorityStyle(rem.priority);
                      const isPast = rem.dueDate && new Date(rem.dueDate) < new Date();
                      return (
                        <div key={rem._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>
                          <button
                            onClick={() => handleCompleteReminder(rem._id)}
                            title="Mark complete"
                            style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{rem.title}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '11px' }}>
                              <span style={{ color: isPast ? '#dc2626' : '#64748b', fontWeight: isPast ? 700 : 500 }}>
                                <FaCalendarAlt size={9} /> {formatDate(rem.dueDate)}
                              </span>
                              <span style={{ background: pStyle.bg, color: pStyle.color, padding: '1px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                                {rem.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: PIPELINE & STAGE */}
      {activeTab === 'stage' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Current Stage Overview Box */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Current Pipeline Status</span>
                <h2 style={{ margin: '4px 0 0', fontSize: '24px', color: currentStageInfo.color, fontWeight: 700 }}>
                  {currentStageInfo.label}
                </h2>
              </div>
              <button
                onClick={() => setShowStageModal(true)}
                style={{
                  padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <FaLayerGroup /> Transition / Change Stage
              </button>
            </div>

            {/* Stepper Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '16px' }}>
              {PIPELINE_STAGES.map((s, idx) => {
                const currentIndex = PIPELINE_STAGES.findIndex((st) => st.key === currentStageKey);
                const isDone = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                return (
                  <div
                    key={s.key}
                    onClick={() => setShowStageModal(true)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '12px',
                      border: isCurrent ? `2px solid ${s.color}` : '1px solid #e2e8f0',
                      background: isCurrent ? s.bg : isDone ? '#f0fdf4' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                      background: isDone ? '#16a34a' : isCurrent ? s.color : '#cbd5e1',
                      color: isDone || isCurrent ? 'white' : '#475569'
                    }}>
                      {isDone ? <FaCheck size={11} /> : idx + 1}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 600, color: isCurrent ? s.color : '#334155' }}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage Transition History */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaHistory color="#2563eb" /> Stage Transition History
            </h3>

            {stageHistory.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                <p style={{ margin: 0 }}>No stage transition events logged yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stageHistory.map((item) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #2563eb', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                        {item.oldStage} → <span style={{ color: '#2563eb' }}>{item.newStage}</span>
                      </div>
                      {item.notes && <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{item.notes}</div>}
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Changed by: {item.changedBy?.name || 'User'}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {formatDateTime(item.changedAt || item.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: REMARKS & NOTES */}
      {activeTab === 'remarks' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Top Control Bar */}
          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'note', 'call', 'meeting', 'email', 'follow-up'].map((f) => (
                <button
                  key={f}
                  onClick={() => setRemarkFilter(f)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: remarkFilter === f ? '#2563eb' : '#e2e8f0',
                    background: remarkFilter === f ? '#eff6ff' : 'white',
                    color: remarkFilter === f ? '#2563eb' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {f === 'all' ? 'All Remarks' : f}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddRemark(!showAddRemark)}
              style={{
                padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <FaPlus size={11} /> {showAddRemark ? 'Close Form' : 'Add Remark'}
            </button>
          </div>

          {/* Add Remark Component (Toggled) */}
          {showAddRemark && (
            <AddRemark
              LeadId={lead._id}
              onAdded={handleRemarkAdded}
              onCancel={() => setShowAddRemark(false)}
            />
          )}

          {/* Remarks List */}
          {filteredRemarks.length === 0 ? (
            <div style={{ background: 'white', padding: '40px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
              <FaStickyNote size={32} style={{ marginBottom: '12px' }} />
              <p style={{ margin: '0 0 12px', fontSize: '14px' }}>No remarks found under the selected filter.</p>
              <button
                onClick={() => setShowAddRemark(true)}
                style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                + Add New Remark
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredRemarks.map((remark) => {
                const style = getRemarkTypeStyle(remark.type);
                return (
                  <div
                    key={remark._id}
                    style={{
                      background: 'white',
                      padding: '18px 20px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      borderLeft: `4px solid ${style.color}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, background: style.bg, color: style.color, border: `1px solid ${style.border}`, padding: '2px 10px', borderRadius: '12px' }}>
                          {style.label}
                        </span>
                        {remark.visibility && (
                          <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', textTransform: 'capitalize' }}>
                            {remark.visibility}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteRemark(remark._id)}
                        title="Delete remark"
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}
                      >
                        <FaTrash />
                      </button>
                    </div>

                    <p style={{ color: '#1e293b', fontSize: '14px', lineHeight: 1.5, margin: '0 0 12px' }}>
                      {remark.content}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaUser size={10} /> {remark.user?.name || 'User'}
                      </span>
                      <span>
                        <FaCalendarAlt size={10} /> {formatDateTime(remark.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: REMINDERS */}
      {activeTab === 'reminders' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Top Control Bar */}
          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: `Pending (${pendingReminders.length})` },
                { key: 'overdue', label: `Overdue (${overdueReminders.length})` },
                { key: 'completed', label: 'Completed' }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setReminderFilter(f.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: reminderFilter === f.key ? '#2563eb' : '#e2e8f0',
                    background: reminderFilter === f.key ? '#eff6ff' : 'white',
                    color: reminderFilter === f.key ? '#2563eb' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddReminder(!showAddReminder)}
              style={{
                padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <FaPlus size={11} /> {showAddReminder ? 'Close Form' : 'Add Reminder'}
            </button>
          </div>

          {/* Add Reminder Component (Toggled) */}
          {showAddReminder && (
            <AddReminder
              LeadId={lead._id}
              onAdded={handleReminderAdded}
              onCancel={() => setShowAddReminder(false)}
            />
          )}

          {/* Reminders List */}
          {filteredReminders.length === 0 ? (
            <div style={{ background: 'white', padding: '40px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
              <FaRegClock size={32} style={{ marginBottom: '12px' }} />
              <p style={{ margin: '0 0 12px', fontSize: '14px' }}>No reminders found in this category.</p>
              <button
                onClick={() => setShowAddReminder(true)}
                style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                + Schedule Reminder
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredReminders.map((rem) => {
                const pStyle = getReminderPriorityStyle(rem.priority);
                const isOverdue = rem.status === 'overdue' || (rem.status === 'pending' && new Date(rem.dueDate) < new Date());
                const isCompleted = rem.status === 'completed';

                return (
                  <div
                    key={rem._id}
                    style={{
                      background: 'white',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <button
                        onClick={() => handleCompleteReminder(rem._id)}
                        disabled={isCompleted}
                        title={isCompleted ? 'Completed' : 'Mark as completed'}
                        style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          border: isCompleted ? '1px solid #16a34a' : '1px solid #cbd5e1',
                          background: isCompleted ? '#dcfce7' : 'white',
                          color: '#16a34a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isCompleted ? 'default' : 'pointer',
                          marginTop: '2px'
                        }}
                      >
                        {isCompleted && <FaCheck size={12} />}
                      </button>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: isCompleted ? '#94a3b8' : '#0f172a', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                            {rem.title}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}`, padding: '1px 8px', borderRadius: '10px', textTransform: 'capitalize' }}>
                            {rem.priority}
                          </span>
                          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: '10px', textTransform: 'capitalize' }}>
                            {rem.type || 'Task'}
                          </span>
                          {isOverdue && !isCompleted && (
                            <span style={{ fontSize: '11px', fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '1px 8px', borderRadius: '10px' }}>
                              ⚠️ Overdue
                            </span>
                          )}
                        </div>

                        {rem.description && (
                          <p style={{ margin: '6px 0', fontSize: '13px', color: '#64748b' }}>{rem.description}</p>
                        )}

                        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                          <span>Due: <strong>{formatDateTime(rem.dueDate)}</strong></span>
                          <span>Owner: {rem.user?.name || 'User'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteReminder(rem._id)}
                      title="Delete reminder"
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: WHATSAPP CHAT */}
      {activeTab === 'whatsapp' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaWhatsapp size={22} color="#16a34a" />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>WhatsApp with {lead.name}</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{lead.phone || 'No phone number configured'}</span>
              </div>
            </div>

            {lead.phone && (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#16a34a', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Open in WhatsApp Web <FaExternalLinkAlt size={10} />
              </a>
            )}
          </div>

          {/* Quick Reply Templates */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[
              `Hi ${lead.name}, thank you for reaching out to us. We have received your construction requirements.`,
              `Hello ${lead.name}, this is regarding our scheduled site inspection. Please let us know a convenient time.`,
              `Hi ${lead.name}, sharing the revised project quotation for your review.`
            ].map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setWaText(tmpl)}
                style={{
                  padding: '6px 12px', background: '#f8fafc', border: '1px solid #cbd5e1',
                  borderRadius: '20px', fontSize: '11px', color: '#475569', cursor: 'pointer'
                }}
              >
                Template {idx + 1}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div style={{
            background: '#efeae2',
            borderRadius: '12px',
            padding: '16px',
            height: '320px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '16px'
          }}>
            {waMessages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                <FaWhatsapp size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No WhatsApp messages logged for this lead yet.</p>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Type below to send an outgoing WhatsApp message.</span>
              </div>
            ) : (
              waMessages.map((msg) => (
                <div
                  key={msg._id}
                  style={{
                    alignSelf: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                    background: msg.direction === 'outgoing' ? '#d9fdd3' : 'white',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    maxWidth: '75%',
                    fontSize: '13px',
                    color: '#111827',
                    boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
                  }}
                >
                  <div>{msg.body || msg.content}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'right', marginTop: '2px' }}>
                    {formatDateTime(msg.timestamp || msg.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Send Box */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={waText}
              onChange={(e) => setWaText(e.target.value)}
              placeholder="Type WhatsApp message..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendWhatsApp(); }}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none'
              }}
            />
            <button
              onClick={handleSendWhatsApp}
              disabled={waSending || !waText.trim()}
              style={{
                padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none',
                borderRadius: '10px', cursor: waSending || !waText.trim() ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                opacity: waSending || !waText.trim() ? 0.6 : 1
              }}
            >
              <FaPaperPlane size={12} /> {waSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 6: FULL DETAILS */}
      {activeTab === 'details' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>Complete Lead Information</h3>
            <button
              onClick={() => setShowEditModal(true)}
              style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FaEdit size={12} /> Edit Details
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Full Name</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 600 }}>{lead.name}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Company Name</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>{lead.company || '—'}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Phone Number</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>{lead.phone || '—'}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Email Address</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>{lead.email || '—'}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Lead Status</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 600, textTransform: 'capitalize' }}>{lead.status || 'Active'}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Pipeline Stage</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: currentStageInfo.color, fontWeight: 700 }}>{currentStageInfo.label}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Lead Source</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500, textTransform: 'capitalize' }}>{lead.source || 'Website'}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Project Value</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#16a34a', fontWeight: 700 }}>{formatCurrency(lead.projectValue)}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Address</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>{lead.address || '—'}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>City / State / Zip</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>
                {[lead.city, lead.state, lead.zipCode].filter(Boolean).join(', ') || '—'}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Assigned Executive</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 600 }}>{lead.assignedTo?.name || 'Unassigned'}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Assigned Team</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>{lead.team?.name || '—'}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Created Date</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>{formatDateTime(lead.createdAt)}</p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Last Contacted</span>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>{formatDateTime(lead.lastContactDate || lead.updatedAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lead Stage Transition Modal */}
      {showStageModal && (
        <LeadStageModal
          lead={lead}
          onClose={() => setShowStageModal(false)}
          onUpdated={() => {
            loadLeadData();
            loadRemarks();
          }}
        />
      )}

      {/* Quick Edit Profile Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', width: 'min(640px, 95vw)', maxHeight: '90vh',
            overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>Edit Lead Information</h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpdateLeadSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Company</label>
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Phone *</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Project Value (₹)</label>
                  <input
                    type="number"
                    value={editForm.projectValue}
                    onChange={(e) => setEditForm({ ...editForm, projectValue: e.target.value })}
                    placeholder="e.g. 1500000"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Source</label>
                  <select
                    value={editForm.source}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social">Social Media</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="import">Import</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Zip Code</label>
                  <input
                    type="text"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingLead}
                  style={{
                    padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px',
                    cursor: updatingLead ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600
                  }}
                >
                  {updatingLead ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadProfile;

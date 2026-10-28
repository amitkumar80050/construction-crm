import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaTrash,
  FaEdit,
  FaComments,
  FaPhoneAlt,
  FaHandshake,
  FaEnvelope,
  FaStickyNote,
  FaRegClock,
  FaGlobe,
  FaUsers,
  FaLock,
  FaCopy,
  FaCheck,
  FaBuilding,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaFilter,
  FaLightbulb,
} from 'react-icons/fa';
import remarkService from '../services/remarkService';
import Leadservice from '../services/leadService';
import './Remarks.css';

// Type color mapping with modern palette
const TYPE_CONFIG = {
  call: {
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: FaPhoneAlt,
    label: 'Call',
  },
  meeting: {
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: FaHandshake,
    label: 'Meeting',
  },
  email: {
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    icon: FaEnvelope,
    label: 'Email',
  },
  note: {
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: FaStickyNote,
    label: 'Note',
  },
  'follow-up': {
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: FaRegClock,
    label: 'Follow-up',
  },
};

const VISIBILITY_CONFIG = {
  public: {
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: FaGlobe,
    label: 'Public',
  },
  team: {
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: FaUsers,
    label: 'Team',
  },
  private: {
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: FaLock,
    label: 'Private',
  },
};

const QUICK_TEMPLATES = [
  { label: '📞 Call: Connected & shared overview', type: 'call', text: 'Conducted a call with the lead. Discussed project specifications, budget expectations, and shared company portfolio. Client showed good interest.' },
  { label: '🤝 Meeting: Site walkthrough done', type: 'meeting', text: 'Completed in-person site inspection and walkthrough with the client. Reviewed structural blueprints and promised revised estimation.' },
  { label: '✉️ Email: Proposal sent', type: 'email', text: 'Sent formal quotation and proposal deck with complete scope of work via email. Awaiting client review.' },
  { label: '⏰ Follow-up: Callback scheduled', type: 'follow-up', text: 'Scheduled follow-up discussion for next week to review contract terms and payment milestones.' },
];

// Relative date formatter
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

// Text highlighter for instant search
const HighlightText = ({ text = '', search = '' }) => {
  if (!search.trim() || !text) return <>{text}</>;
  
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="highlight-match">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const Remarks = () => {
  const navigate = useNavigate();

  // State
  const [remarks, setRemarks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLead, setFilterLead] = useState('all');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Copy feedback
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add Remark Form State
  const [newRemark, setNewRemark] = useState({
    Lead: '',
    content: '',
    type: 'note',
    visibility: 'public',
  });

  // Edit Remark Form State
  const [editingRemark, setEditingRemark] = useState(null);

  // Fetch remarks
  const fetchRemarks = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setIsRefreshing(true);

    try {
      // Fetch up to 500 remarks to power ultra-fast instant search & client filtering
      const res = await remarkService.getAllRemarks({ limit: 500 });
      setRemarks(res.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load remarks';
      toast.error(message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      const res = await Leadservice.getLeads({ limit: 300 });
      setLeads(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load leads:', error);
    }
  }, []);

  useEffect(() => {
    fetchRemarks();
    fetchLeads();
  }, [fetchRemarks, fetchLeads]);

  // Handle Add Remark
  const handleAddRemark = async (e) => {
    if (e) e.preventDefault();
    const leadId = newRemark.Lead || newRemark.lead;
    if (!leadId) {
      toast.error('Please select a lead');
      return;
    }
    if (!newRemark.content.trim()) {
      toast.error('Please enter remark content');
      return;
    }

    setSaving(true);
    try {
      const res = await remarkService.createRemark({
        Lead: leadId,
        content: newRemark.content.trim(),
        type: newRemark.type,
        visibility: newRemark.visibility,
      });

      toast.success('Remark added successfully!');
      setShowAddModal(false);
      setNewRemark({ Lead: '', content: '', type: 'note', visibility: 'public' });
      
      // Prepend to remarks list or refresh
      if (res.data?.data) {
        setRemarks((prev) => [res.data.data, ...prev]);
      } else {
        fetchRemarks(true);
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to add remark';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit Remark
  const handleOpenEdit = (remark) => {
    setEditingRemark({
      _id: remark._id,
      Lead: remark.Lead?._id || remark.Lead,
      leadName: remark.Lead?.name || 'Unknown Lead',
      company: remark.Lead?.company || '',
      content: remark.content,
      type: remark.type,
      visibility: remark.visibility,
    });
    setShowEditModal(true);
  };

  const handleUpdateRemark = async (e) => {
    if (e) e.preventDefault();
    if (!editingRemark.content.trim()) {
      toast.error('Remark content cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const res = await remarkService.updateRemark(editingRemark._id, {
        content: editingRemark.content.trim(),
        type: editingRemark.type,
        visibility: editingRemark.visibility,
      });

      const updated = res.data?.data;
      setRemarks((prev) =>
        prev.map((r) =>
          r._id === editingRemark._id
            ? { ...r, ...updated, Lead: r.Lead }
            : r
        )
      );

      toast.success('Remark updated successfully!');
      setShowEditModal(false);
      setEditingRemark(null);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to update remark';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Remark
  const deleteRemark = async (id) => {
    if (!window.confirm('Are you sure you want to delete this remark?')) return;
    try {
      await remarkService.deleteRemark(id);
      setRemarks((prev) => prev.filter((r) => r._id !== id));
      toast.success('Remark deleted successfully!');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete remark';
      toast.error(message);
    }
  };

  // Copy content
  const handleCopy = (id, text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.info('Copied note to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Apply Quick Template
  const handleApplyTemplate = (template) => {
    setNewRemark((prev) => ({
      ...prev,
      type: template.type,
      content: prev.content ? `${prev.content}\n${template.text}` : template.text,
    }));
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = remarks.length;
    const calls = remarks.filter((r) => r.type === 'call').length;
    const meetings = remarks.filter((r) => r.type === 'meeting').length;
    const emails = remarks.filter((r) => r.type === 'email').length;
    const notes = remarks.filter((r) => r.type === 'note').length;
    const followUps = remarks.filter((r) => r.type === 'follow-up').length;

    return { total, calls, meetings, emails, notes, followUps };
  }, [remarks]);

  // Instant filtering and searching (Runs synchronously on key stroke - 0ms delay!)
  const filteredRemarks = useMemo(() => {
    return remarks
      .filter((remark) => {
        // Type filter
        if (filterType !== 'all' && remark.type !== filterType) return false;

        // Visibility filter
        if (filterVisibility !== 'all' && remark.visibility !== filterVisibility) return false;

        // Lead filter
        if (filterLead !== 'all') {
          const lId = remark.Lead?._id || remark.Lead;
          if (lId !== filterLead) return false;
        }

        // Instant search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const leadName = (remark.Lead?.name || '').toLowerCase();
          const company = (remark.Lead?.company || '').toLowerCase();
          const phone = (remark.Lead?.phone || '').toLowerCase();
          const content = (remark.content || '').toLowerCase();
          const author = (remark.user?.name || '').toLowerCase();
          const type = (remark.type || '').toLowerCase();
          const visibility = (remark.visibility || '').toLowerCase();

          const matches =
            leadName.includes(term) ||
            company.includes(term) ||
            phone.includes(term) ||
            content.includes(term) ||
            author.includes(term) ||
            type.includes(term) ||
            visibility.includes(term);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'lead-asc') {
          return (a.Lead?.name || '').localeCompare(b.Lead?.name || '');
        }
        if (sortBy === 'lead-desc') {
          return (b.Lead?.name || '').localeCompare(a.Lead?.name || '');
        }
        return 0;
      });
  }, [remarks, filterType, filterVisibility, filterLead, searchTerm, sortBy]);

  // Check if any filter is active
  const isAnyFilterActive =
    searchTerm.trim() !== '' ||
    filterType !== 'all' ||
    filterLead !== 'all' ||
    filterVisibility !== 'all' ||
    sortBy !== 'newest';

  const resetAllFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterLead('all');
    setFilterVisibility('all');
    setSortBy('newest');
  };

  return (
    <div className="remarks-container">
      {/* Header */}
      <div className="remarks-header">
        <div className="remarks-title-area">
          <div className="remarks-title-row">
            <h1 className="remarks-main-title">Remarks & Notes</h1>
            <span className="remarks-count-pill">
              <FaComments size={13} />
              {remarks.length} {remarks.length === 1 ? 'Remark' : 'Remarks'}
            </span>
          </div>
          <p className="remarks-subtitle">
            Track and search all client interactions, phone call logs, meeting recaps, and internal notes
          </p>
        </div>

        <div className="remarks-header-actions">
          <button
            onClick={() => fetchRemarks(true)}
            className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
            title="Refresh remarks"
            disabled={isRefreshing}
          >
            <FaSyncAlt />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-add-remark"
            id="btn-add-remark-trigger"
          >
            <FaPlus /> Add Remark
          </button>
        </div>
      </div>

      {/* Interactive Quick Stats / Filter Chips */}
      <div className="remarks-stats-row">
        <div
          className={`stat-chip ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
          style={{ borderColor: filterType === 'all' ? '#2563eb' : undefined }}
        >
          <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FaComments />
          </div>
          <div className="stat-details">
            <span className="stat-count">{stats.total}</span>
            <span className="stat-label">All Remarks</span>
          </div>
        </div>

        <div
          className={`stat-chip ${filterType === 'call' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'call' ? 'all' : 'call')}
          style={{ borderColor: filterType === 'call' ? TYPE_CONFIG.call.color : undefined }}
        >
          <div
            className="stat-icon-wrapper"
            style={{ background: TYPE_CONFIG.call.bg, color: TYPE_CONFIG.call.color }}
          >
            <FaPhoneAlt />
          </div>
          <div className="stat-details">
            <span className="stat-count">{stats.calls}</span>
            <span className="stat-label">Calls</span>
          </div>
        </div>

        <div
          className={`stat-chip ${filterType === 'meeting' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'meeting' ? 'all' : 'meeting')}
          style={{ borderColor: filterType === 'meeting' ? TYPE_CONFIG.meeting.color : undefined }}
        >
          <div
            className="stat-icon-wrapper"
            style={{ background: TYPE_CONFIG.meeting.bg, color: TYPE_CONFIG.meeting.color }}
          >
            <FaHandshake />
          </div>
          <div className="stat-details">
            <span className="stat-count">{stats.meetings}</span>
            <span className="stat-label">Meetings</span>
          </div>
        </div>

        <div
          className={`stat-chip ${filterType === 'email' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'email' ? 'all' : 'email')}
          style={{ borderColor: filterType === 'email' ? TYPE_CONFIG.email.color : undefined }}
        >
          <div
            className="stat-icon-wrapper"
            style={{ background: TYPE_CONFIG.email.bg, color: TYPE_CONFIG.email.color }}
          >
            <FaEnvelope />
          </div>
          <div className="stat-details">
            <span className="stat-count">{stats.emails}</span>
            <span className="stat-label">Emails</span>
          </div>
        </div>

        <div
          className={`stat-chip ${filterType === 'note' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'note' ? 'all' : 'note')}
          style={{ borderColor: filterType === 'note' ? TYPE_CONFIG.note.color : undefined }}
        >
          <div
            className="stat-icon-wrapper"
            style={{ background: TYPE_CONFIG.note.bg, color: TYPE_CONFIG.note.color }}
          >
            <FaStickyNote />
          </div>
          <div className="stat-details">
            <span className="stat-count">{stats.notes}</span>
            <span className="stat-label">Notes</span>
          </div>
        </div>

        <div
          className={`stat-chip ${filterType === 'follow-up' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'follow-up' ? 'all' : 'follow-up')}
          style={{ borderColor: filterType === 'follow-up' ? TYPE_CONFIG['follow-up'].color : undefined }}
        >
          <div
            className="stat-icon-wrapper"
            style={{
              background: TYPE_CONFIG['follow-up'].bg,
              color: TYPE_CONFIG['follow-up'].color,
            }}
          >
            <FaRegClock />
          </div>
          <div className="stat-details">
            <span className="stat-count">{stats.followUps}</span>
            <span className="stat-label">Follow-ups</span>
          </div>
        </div>
      </div>

      {/* Filter and Instant Search Bar */}
      <div className="remarks-filter-panel">
        <div className="filter-primary-row">
          {/* Instant Live Search */}
          <div className="instant-search-box">
            <FaSearch className="search-icon-left" />
            <input
              type="text"
              id="remarks-instant-search-input"
              className="instant-search-input"
              placeholder="Instant search by lead name, company, remark content, user, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
            {searchTerm && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Row */}
          <div className="filter-selects-row">
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
              id="filter-type-select"
              aria-label="Filter by type"
            >
              <option value="all">All Types</option>
              <option value="call">📞 Call</option>
              <option value="meeting">🤝 Meeting</option>
              <option value="email">✉️ Email</option>
              <option value="note">📝 Note</option>
              <option value="follow-up">⏰ Follow-up</option>
            </select>

            {/* Lead Filter */}
            <select
              value={filterLead}
              onChange={(e) => setFilterLead(e.target.value)}
              className="filter-select"
              id="filter-lead-select"
              aria-label="Filter by lead"
            >
              <option value="all">All Leads</option>
              {leads.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name} {l.company ? `(${l.company})` : ''}
                </option>
              ))}
            </select>

            {/* Visibility Filter */}
            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="filter-select"
              id="filter-visibility-select"
              aria-label="Filter by visibility"
            >
              <option value="all">All Visibility</option>
              <option value="public">🌐 Public</option>
              <option value="team">👥 Team</option>
              <option value="private">🔒 Private</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
              id="filter-sort-select"
              aria-label="Sort order"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">⏳ Oldest First</option>
              <option value="lead-asc">🔤 Lead (A to Z)</option>
              <option value="lead-desc">🔤 Lead (Z to A)</option>
            </select>

            {/* Reset Filters */}
            {isAnyFilterActive && (
              <button
                className="btn-reset-filters"
                onClick={resetAllFilters}
                title="Reset all filters"
              >
                <FaFilter /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Live Filter Indicator Summary */}
        <div className="filter-active-summary">
          <div className="active-filter-tags">
            <span>
              Showing <strong>{filteredRemarks.length}</strong> of {remarks.length} remarks
            </span>
            {searchTerm && (
              <span className="active-filter-badge">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm('')}>
                  <FaTimes />
                </button>
              </span>
            )}
            {filterType !== 'all' && (
              <span className="active-filter-badge">
                Type: {filterType}
                <button onClick={() => setFilterType('all')}>
                  <FaTimes />
                </button>
              </span>
            )}
            {filterLead !== 'all' && (
              <span className="active-filter-badge">
                Lead Filtered
                <button onClick={() => setFilterLead('all')}>
                  <FaTimes />
                </button>
              </span>
            )}
            {filterVisibility !== 'all' && (
              <span className="active-filter-badge">
                Visibility: {filterVisibility}
                <button onClick={() => setFilterVisibility('all')}>
                  <FaTimes />
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remarks Content List */}
      {loading ? (
        <div className="remarks-list">
          {[1, 2, 3].map((n) => (
            <div key={n} className="remarks-skeleton-card">
              <div className="skeleton-line" style={{ width: '40%' }}></div>
              <div className="skeleton-line" style={{ width: '85%' }}></div>
              <div className="skeleton-line" style={{ width: '30%', height: '12px' }}></div>
            </div>
          ))}
        </div>
      ) : filteredRemarks.length === 0 ? (
        <div className="remarks-empty-state">
          <div className="empty-icon-circle">
            <FaComments />
          </div>
          <h3 className="empty-title">
            {isAnyFilterActive ? 'No matching remarks found' : 'No remarks or notes yet'}
          </h3>
          <p className="empty-subtitle">
            {isAnyFilterActive
              ? `We couldn't find any remarks matching your current search and filter criteria. Try adjusting your query.`
              : `Start tracking your customer discussions, phone logs, and notes by adding your first remark.`}
          </p>
          {isAnyFilterActive ? (
            <button
              onClick={resetAllFilters}
              className="btn-modal-cancel"
              style={{ marginTop: '10px' }}
            >
              Clear All Filters
            </button>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-add-remark"
              style={{ marginTop: '10px' }}
            >
              <FaPlus /> Add Your First Remark
            </button>
          )}
        </div>
      ) : (
        <div className="remarks-list">
          {filteredRemarks.map((remark) => {
            const typeConf = TYPE_CONFIG[remark.type] || TYPE_CONFIG.note;
            const visConf = VISIBILITY_CONFIG[remark.visibility] || VISIBILITY_CONFIG.public;
            const TypeIcon = typeConf.icon;
            const VisIcon = visConf.icon;
            const leadId = remark.Lead?._id || remark.Lead;
            const leadName = remark.Lead?.name || 'Unknown Lead';
            const company = remark.Lead?.company;
            const authorName = remark.user?.name || 'User';
            const authorInitials = authorName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2);

            return (
              <div
                key={remark._id}
                className="remark-card"
                style={{ borderLeft: `4px solid ${typeConf.color}` }}
              >
                {/* Header row */}
                <div className="remark-card-header">
                  <div className="remark-lead-info">
                    <span
                      className="remark-lead-name"
                      onClick={() => leadId && navigate(`/Leads/${leadId}`)}
                      title={leadId ? `Go to lead profile: ${leadName}` : undefined}
                    >
                      <HighlightText text={leadName} search={searchTerm} />
                      {leadId && <FaExternalLinkAlt className="lead-link-icon" />}
                    </span>

                    {company && (
                      <span className="remark-company-badge">
                        <FaBuilding size={11} />
                        <HighlightText text={company} search={searchTerm} />
                      </span>
                    )}

                    {/* Type Badge */}
                    <span
                      className="remark-pill"
                      style={{
                        background: typeConf.bg,
                        color: typeConf.color,
                        border: `1px solid ${typeConf.border}`,
                      }}
                    >
                      <TypeIcon size={11} />
                      {typeConf.label}
                    </span>

                    {/* Visibility Badge */}
                    <span
                      className="remark-pill"
                      style={{
                        background: visConf.bg,
                        color: visConf.color,
                        border: `1px solid ${visConf.border}`,
                      }}
                    >
                      <VisIcon size={11} />
                      {visConf.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="remark-card-actions">
                    <button
                      className="action-icon-btn copy"
                      onClick={() => handleCopy(remark._id, remark.content)}
                      title="Copy note content"
                    >
                      {copiedId === remark._id ? (
                        <>
                          <FaCheck size={12} color="#16a34a" /> Copied!
                        </>
                      ) : (
                        <>
                          <FaCopy size={12} /> Copy
                        </>
                      )}
                    </button>
                    <button
                      className="action-icon-btn edit"
                      onClick={() => handleOpenEdit(remark)}
                      title="Edit remark"
                    >
                      <FaEdit size={12} /> Edit
                    </button>
                    <button
                      className="action-icon-btn delete"
                      onClick={() => deleteRemark(remark._id)}
                      title="Delete remark"
                    >
                      <FaTrash size={12} /> Delete
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="remark-content-text">
                  <HighlightText text={remark.content} search={searchTerm} />
                </div>

                {/* Footer Metadata */}
                <div className="remark-footer">
                  <div className="remark-author-meta">
                    <div className="user-avatar-circle">{authorInitials}</div>
                    <span className="user-author-name">
                      <HighlightText text={authorName} search={searchTerm} />
                    </span>
                    {remark.user?.role && (
                      <span className="user-role-badge">{remark.user.role}</span>
                    )}
                  </div>

                  <div
                    className="remark-time-meta"
                    title={new Date(remark.createdAt).toLocaleString()}
                  >
                    <FaCalendarAlt size={12} />
                    <span>{new Date(remark.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(remark.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Remark Modal */}
      {showAddModal && (
        <div
          className="modal-backdrop-blur"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="modal-dialog-box" role="dialog" aria-modal="true">
            <div className="modal-header-row">
              <div className="modal-title-wrap">
                <div className="modal-title-icon">
                  <FaPlus />
                </div>
                <div>
                  <h2 className="modal-title">Add New Remark</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Record an interaction or add an internal note
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddRemark}>
              {/* Select Lead */}
              <div className="form-group-custom">
                <label className="form-label-custom">Select Lead *</label>
                <select
                  value={newRemark.Lead}
                  onChange={(e) => setNewRemark({ ...newRemark, Lead: e.target.value })}
                  className="form-select-custom"
                  required
                >
                  <option value="">-- Choose a Lead --</option>
                  {leads.map((lead) => (
                    <option key={lead._id} value={lead._id}>
                      {lead.name} {lead.company ? `— ${lead.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interaction Type Picker */}
              <div className="form-group-custom">
                <label className="form-label-custom">Interaction Type</label>
                <div className="type-buttons-selector">
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = newRemark.type === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`type-select-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setNewRemark({ ...newRemark, type: key })}
                        style={{
                          borderColor: isSelected ? config.color : undefined,
                          background: isSelected ? config.bg : undefined,
                          color: isSelected ? config.color : undefined,
                        }}
                      >
                        <Icon size={15} />
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Preset Templates */}
              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontSize: '12px', color: '#64748b' }}>
                  <FaLightbulb style={{ marginRight: '5px', color: '#f59e0b' }} />
                  Quick Presets (Click to insert)
                </label>
                <div className="quick-templates-wrap">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="template-chip"
                      onClick={() => handleApplyTemplate(tmpl)}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remark Content */}
              <div className="form-group-custom">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label className="form-label-custom" style={{ marginBottom: 0 }}>
                    Remark Content *
                  </label>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {newRemark.content.length} characters
                  </span>
                </div>
                <textarea
                  value={newRemark.content}
                  onChange={(e) => setNewRemark({ ...newRemark, content: e.target.value })}
                  placeholder="Type notes, client remarks, follow-up action items..."
                  rows="4"
                  className="form-textarea-custom"
                  required
                />
              </div>

              {/* Visibility Picker */}
              <div className="form-group-custom">
                <label className="form-label-custom">Visibility Level</label>
                <div className="visibility-options-grid">
                  {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = newRemark.visibility === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`visibility-opt-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setNewRemark({ ...newRemark, visibility: key })}
                      >
                        <Icon size={13} />
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer-row">
                <span className="modal-hint-text">Esc to cancel</span>
                <div className="modal-btns-group">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-modal-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-modal-submit"
                  >
                    {saving ? 'Adding...' : 'Add Remark'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Remark Modal */}
      {showEditModal && editingRemark && (
        <div
          className="modal-backdrop-blur"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div className="modal-dialog-box" role="dialog" aria-modal="true">
            <div className="modal-header-row">
              <div className="modal-title-wrap">
                <div className="modal-title-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <FaEdit />
                </div>
                <div>
                  <h2 className="modal-title">Edit Remark</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Lead: <strong>{editingRemark.leadName}</strong>
                    {editingRemark.company ? ` (${editingRemark.company})` : ''}
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowEditModal(false)}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpdateRemark}>
              {/* Type Picker */}
              <div className="form-group-custom">
                <label className="form-label-custom">Interaction Type</label>
                <div className="type-buttons-selector">
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = editingRemark.type === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`type-select-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setEditingRemark({ ...editingRemark, type: key })}
                        style={{
                          borderColor: isSelected ? config.color : undefined,
                          background: isSelected ? config.bg : undefined,
                          color: isSelected ? config.color : undefined,
                        }}
                      >
                        <Icon size={15} />
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remark Content */}
              <div className="form-group-custom">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label className="form-label-custom" style={{ marginBottom: 0 }}>
                    Remark Content *
                  </label>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {editingRemark.content.length} characters
                  </span>
                </div>
                <textarea
                  value={editingRemark.content}
                  onChange={(e) =>
                    setEditingRemark({ ...editingRemark, content: e.target.value })
                  }
                  rows="4"
                  className="form-textarea-custom"
                  required
                />
              </div>

              {/* Visibility Picker */}
              <div className="form-group-custom">
                <label className="form-label-custom">Visibility Level</label>
                <div className="visibility-options-grid">
                  {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = editingRemark.visibility === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`visibility-opt-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() =>
                          setEditingRemark({ ...editingRemark, visibility: key })
                        }
                      >
                        <Icon size={13} />
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer-row">
                <span className="modal-hint-text">Esc to cancel</span>
                <div className="modal-btns-group">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-modal-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-modal-submit"
                    style={{ background: '#16a34a' }}
                  >
                    {saving ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Remarks;
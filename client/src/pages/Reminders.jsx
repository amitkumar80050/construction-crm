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
  FaCheck,
  FaCheckCircle,
  FaBell,
  FaExclamationTriangle,
  FaClock,
  FaPhoneAlt,
  FaHandshake,
  FaTasks,
  FaBuilding,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaFilter,
  FaLightbulb,
  FaRedo,
} from 'react-icons/fa';
import reminderService from '../services/reminderService';
import Leadservice from '../services/leadService';
import './Reminders.css';

// Type mapping
const TYPE_CONFIG = {
  'follow-up': {
    label: 'Follow-Up',
    icon: FaClock,
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  call: {
    label: 'Call',
    icon: FaPhoneAlt,
    color: '#2563eb',
    bg: '#eff6ff',
  },
  meeting: {
    label: 'Meeting',
    icon: FaHandshake,
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  task: {
    label: 'Task',
    icon: FaTasks,
    color: '#10b981',
    bg: '#ecfdf5',
  },
  other: {
    label: 'Other',
    icon: FaBell,
    color: '#64748b',
    bg: '#f8fafc',
  },
};

const PRIORITY_CONFIG = {
  high: { label: 'High', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  medium: { label: 'Medium', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  low: { label: 'Low', color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
};

const QUICK_TEMPLATES = [
  { title: 'Follow-up on proposal & pricing quotation', type: 'follow-up', priority: 'high', desc: 'Contact client to discuss feedback on submitted commercial proposal deck.' },
  { title: 'Site visit coordination & walkthrough', type: 'meeting', priority: 'high', desc: 'Confirm site inspection time with client and assign sales executive.' },
  { title: 'Client call to review architectural blueprint', type: 'call', priority: 'medium', desc: 'Walk client through revised 2D floor plans and elevation views.' },
  { title: 'Send payment milestone reminder & invoice', type: 'task', priority: 'medium', desc: 'Prepare and dispatch advance billing for upcoming construction stage.' },
];

// Helper to determine border color
const getBorderColor = (reminder) => {
  if (reminder.status === 'completed') return '#16a34a';
  if (reminder.status === 'overdue') return '#dc2626';
  if (reminder.priority === 'high') return '#ef4444';
  if (reminder.priority === 'medium') return '#f59e0b';
  return '#94a3b8';
};

// Formatter for countdown or relative time
const getDueInfo = (dueDate, status) => {
  if (status === 'completed') {
    return { text: 'Completed', className: 'completed' };
  }
  if (!dueDate) return { text: 'No due date', className: 'upcoming' };

  const target = new Date(dueDate);
  const now = new Date();
  const diffMs = target - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isPast = diffMs < 0;

  if (isPast) {
    const absDays = Math.abs(diffDays);
    if (absDays <= 1) return { text: 'Overdue today', className: 'overdue' };
    return { text: `Overdue by ${absDays}d`, className: 'overdue' };
  }

  if (diffDays === 0) return { text: 'Due today', className: 'today' };
  if (diffDays === 1) return { text: 'Due tomorrow', className: 'today' };
  if (diffDays <= 7) return { text: `Due in ${diffDays} days`, className: 'upcoming' };

  return { text: target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), className: 'upcoming' };
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

const Reminders = () => {
  const navigate = useNavigate();

  // State
  const [reminders, setReminders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterLead, setFilterLead] = useState('all');
  const [sortBy, setSortBy] = useState('due-asc');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add Reminder State
  const [newReminder, setNewReminder] = useState({
    Lead: '',
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    type: 'follow-up',
  });

  // Edit Reminder State
  const [editingReminder, setEditingReminder] = useState(null);

  // Fetch Reminders
  const fetchReminders = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setIsRefreshing(true);

    try {
      // Pass higher limit so user can instantly search across all reminders
      const res = await reminderService.getReminders({ limit: 500 });
      setReminders(res.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load reminders';
      toast.error(message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch Leads
  const fetchLeads = useCallback(async () => {
    try {
      const res = await Leadservice.getLeads({ limit: 300 });
      setLeads(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load leads:', error);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    fetchLeads();
  }, [fetchReminders, fetchLeads]);

  // Handle Add Reminder
  const handleAddReminder = async (e) => {
    if (e) e.preventDefault();
    const targetLeadId = newReminder.Lead || newReminder.lead;
    if (!targetLeadId) {
      toast.error('Please select a lead');
      return;
    }
    if (!newReminder.title.trim()) {
      toast.error('Please enter a reminder title');
      return;
    }
    if (!newReminder.dueDate) {
      toast.error('Please select a due date');
      return;
    }

    setSaving(true);
    try {
      const res = await reminderService.createReminder({
        Lead: targetLeadId,
        title: newReminder.title.trim(),
        description: newReminder.description ? newReminder.description.trim() : '',
        dueDate: newReminder.dueDate,
        priority: newReminder.priority,
        type: newReminder.type,
      });

      toast.success('Reminder added successfully!');
      setShowAddModal(false);
      setNewReminder({
        Lead: '',
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        type: 'follow-up',
      });

      if (res.data?.data) {
        setReminders((prev) => [res.data.data, ...prev]);
      } else {
        fetchReminders(true);
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to add reminder';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (reminder) => {
    // Format dueDate for datetime-local input
    let formattedDue = '';
    if (reminder.dueDate) {
      const d = new Date(reminder.dueDate);
      const tzOffset = d.getTimezoneOffset() * 60000;
      formattedDue = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    }

    setEditingReminder({
      _id: reminder._id,
      Lead: reminder.Lead?._id || reminder.Lead,
      leadName: reminder.Lead?.name || 'Unknown Lead',
      company: reminder.Lead?.company || '',
      title: reminder.title,
      description: reminder.description || '',
      dueDate: formattedDue,
      priority: reminder.priority || 'medium',
      type: reminder.type || 'follow-up',
      status: reminder.status,
    });
    setShowEditModal(true);
  };

  // Update Reminder
  const handleUpdateReminder = async (e) => {
    if (e) e.preventDefault();
    if (!editingReminder.title.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    if (!editingReminder.dueDate) {
      toast.error('Due date cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const res = await reminderService.updateReminder(editingReminder._id, {
        title: editingReminder.title.trim(),
        description: editingReminder.description.trim(),
        dueDate: editingReminder.dueDate,
        priority: editingReminder.priority,
        type: editingReminder.type,
        status: editingReminder.status,
      });

      const updated = res.data?.data;
      setReminders((prev) =>
        prev.map((r) =>
          r._id === editingReminder._id
            ? { ...r, ...updated, Lead: r.Lead }
            : r
        )
      );

      toast.success('Reminder updated successfully!');
      setShowEditModal(false);
      setEditingReminder(null);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to update reminder';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Mark as Complete
  const handleComplete = async (id) => {
    try {
      const res = await reminderService.completeReminder(id);
      const updated = res.data?.data;

      setReminders((prev) =>
        prev.map((r) =>
          r._id === id
            ? { ...r, status: 'completed', completedAt: new Date().toISOString(), ...(updated ? { Lead: r.Lead } : {}) }
            : r
        )
      );
      toast.success('Reminder marked as completed! 🎉');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to update reminder';
      toast.error(message);
    }
  };

  // Reopen Completed Reminder
  const handleReopen = async (id) => {
    try {
      await reminderService.updateReminder(id, {
        status: 'pending',
        completedAt: null,
      });

      setReminders((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'pending', completedAt: null } : r))
      );
      toast.info('Reminder reopened!');
    } catch (error) {
      toast.error('Unable to reopen reminder');
    }
  };

  // Delete Reminder
  const deleteReminder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await reminderService.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r._id !== id));
      toast.success('Reminder deleted successfully!');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to delete reminder';
      toast.error(message);
    }
  };

  // Quick Preset Selection
  const handleApplyTemplate = (tmpl) => {
    setNewReminder((prev) => ({
      ...prev,
      title: tmpl.title,
      type: tmpl.type,
      priority: tmpl.priority,
      description: tmpl.desc,
    }));
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = reminders.length;
    const completed = reminders.filter((r) => r.status === 'completed').length;
    const overdue = reminders.filter((r) => r.status === 'overdue').length;
    const pending = reminders.filter((r) => r.status === 'pending').length;
    const high = reminders.filter((r) => r.priority === 'high' && r.status !== 'completed').length;

    return { total, completed, overdue, pending, high };
  }, [reminders]);

  // Instant filtering and searching (Synchronous key stroke - 0ms delay)
  const filteredReminders = useMemo(() => {
    return reminders
      .filter((reminder) => {
        // Status filter
        if (filterStatus !== 'all' && reminder.status !== filterStatus) return false;

        // Priority filter
        if (filterPriority !== 'all' && reminder.priority !== filterPriority) return false;

        // Type filter
        if (filterType !== 'all' && reminder.type !== filterType) return false;

        // Lead filter
        if (filterLead !== 'all') {
          const lId = reminder.Lead?._id || reminder.Lead;
          if (lId !== filterLead) return false;
        }

        // Instant search query
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const title = (reminder.title || '').toLowerCase();
          const desc = (reminder.description || '').toLowerCase();
          const leadName = (reminder.Lead?.name || '').toLowerCase();
          const company = (reminder.Lead?.company || '').toLowerCase();
          const type = (reminder.type || '').toLowerCase();
          const priority = (reminder.priority || '').toLowerCase();
          const status = (reminder.status || '').toLowerCase();

          const matches =
            title.includes(term) ||
            desc.includes(term) ||
            leadName.includes(term) ||
            company.includes(term) ||
            type.includes(term) ||
            priority.includes(term) ||
            status.includes(term);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'due-asc') {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (sortBy === 'due-desc') {
          return new Date(b.dueDate) - new Date(a.dueDate);
        }
        if (sortBy === 'priority-desc') {
          const pOrder = { high: 3, medium: 2, low: 1 };
          return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        }
        if (sortBy === 'title-asc') {
          return (a.title || '').localeCompare(b.title || '');
        }
        return 0;
      });
  }, [reminders, filterStatus, filterPriority, filterType, filterLead, searchTerm, sortBy]);

  // Check if any filter is active
  const isAnyFilterActive =
    searchTerm.trim() !== '' ||
    filterStatus !== 'all' ||
    filterPriority !== 'all' ||
    filterType !== 'all' ||
    filterLead !== 'all' ||
    sortBy !== 'due-asc';

  const resetAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterType('all');
    setFilterLead('all');
    setSortBy('due-asc');
  };

  // Format date helper
  const formatDueDate = (dueDate) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="reminders-container">
      {/* Header */}
      <div className="reminders-header">
        <div className="reminders-title-area">
          <div className="reminders-title-row">
            <h1 className="reminders-main-title">Reminders</h1>
            <span
              className={`reminders-count-pill ${stats.overdue > 0 ? 'has-overdue' : ''}`}
            >
              <FaBell size={13} />
              {reminders.length} {reminders.length === 1 ? 'Reminder' : 'Reminders'}
              {stats.overdue > 0 && ` • ${stats.overdue} Overdue`}
            </span>
          </div>
          <p className="reminders-subtitle">
            Manage your reminders, follow-ups, scheduled calls, and action deadlines
          </p>
        </div>

        <div className="reminders-header-actions">
          <button
            onClick={() => fetchReminders(true)}
            className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
            title="Refresh reminders"
            disabled={isRefreshing}
          >
            <FaSyncAlt />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-add-reminder"
            id="btn-add-reminder-trigger"
          >
            <FaPlus /> Add Reminder
          </button>
        </div>
      </div>

      {/* Interactive Quick Stats / Filter Chips */}
      <div className="reminders-stats-row">
        <div
          className={`rem-stat-chip ${filterStatus === 'all' && filterPriority === 'all' ? 'active' : ''}`}
          onClick={() => {
            setFilterStatus('all');
            setFilterPriority('all');
          }}
          style={{
            borderColor: filterStatus === 'all' && filterPriority === 'all' ? '#2563eb' : undefined,
          }}
        >
          <div className="rem-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FaBell />
          </div>
          <div className="rem-stat-details">
            <span className="rem-stat-count">{stats.total}</span>
            <span className="rem-stat-label">All Reminders</span>
          </div>
        </div>

        <div
          className={`rem-stat-chip ${filterStatus === 'overdue' ? 'active' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'overdue' ? 'all' : 'overdue')}
          style={{ borderColor: filterStatus === 'overdue' ? '#dc2626' : undefined }}
        >
          <div className="rem-stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <FaExclamationTriangle />
          </div>
          <div className="rem-stat-details">
            <span className="rem-stat-count">{stats.overdue}</span>
            <span className="rem-stat-label">Overdue</span>
          </div>
        </div>

        <div
          className={`rem-stat-chip ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          style={{ borderColor: filterStatus === 'pending' ? '#2563eb' : undefined }}
        >
          <div className="rem-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FaClock />
          </div>
          <div className="rem-stat-details">
            <span className="rem-stat-count">{stats.pending}</span>
            <span className="rem-stat-label">Pending</span>
          </div>
        </div>

        <div
          className={`rem-stat-chip ${filterStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}
          style={{ borderColor: filterStatus === 'completed' ? '#16a34a' : undefined }}
        >
          <div className="rem-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <FaCheckCircle />
          </div>
          <div className="rem-stat-details">
            <span className="rem-stat-count">{stats.completed}</span>
            <span className="rem-stat-label">Completed</span>
          </div>
        </div>

        <div
          className={`rem-stat-chip ${filterPriority === 'high' ? 'active' : ''}`}
          onClick={() => setFilterPriority(filterPriority === 'high' ? 'all' : 'high')}
          style={{ borderColor: filterPriority === 'high' ? '#dc2626' : undefined }}
        >
          <div className="rem-stat-icon" style={{ background: '#fff1f2', color: '#e11d48' }}>
            <FaBell />
          </div>
          <div className="rem-stat-details">
            <span className="rem-stat-count">{stats.high}</span>
            <span className="rem-stat-label">High Priority</span>
          </div>
        </div>
      </div>

      {/* Filter and Instant Search Panel */}
      <div className="reminders-filter-panel">
        <div className="filter-primary-row">
          {/* Instant Search Bar */}
          <div className="instant-search-box">
            <FaSearch className="search-icon-left" />
            <input
              type="text"
              id="reminders-instant-search-input"
              className="instant-search-input"
              placeholder="Instant search by title, description, lead name, company, or task type..."
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

          {/* Filter Selects */}
          <div className="filter-selects-row">
            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
              id="filter-status-select"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="completed">✅ Completed</option>
              <option value="overdue">⚠️ Overdue</option>
            </select>

            {/* Priority */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="filter-select"
              id="filter-priority-select"
              aria-label="Filter by priority"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">⚪ Low</option>
            </select>

            {/* Type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
              id="filter-type-select"
              aria-label="Filter by type"
            >
              <option value="all">All Types</option>
              <option value="follow-up">⏰ Follow-up</option>
              <option value="call">📞 Call</option>
              <option value="meeting">🤝 Meeting</option>
              <option value="task">📝 Task</option>
              <option value="other">📌 Other</option>
            </select>

            {/* Lead */}
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

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
              id="filter-sort-select"
              aria-label="Sort order"
            >
              <option value="due-asc">📅 Due Date (Earliest)</option>
              <option value="due-desc">📅 Due Date (Latest)</option>
              <option value="priority-desc">🔥 Priority (High to Low)</option>
              <option value="title-asc">🔤 Title (A to Z)</option>
            </select>

            {/* Reset */}
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

        {/* Filter Summary Badge Bar */}
        <div className="filter-active-summary">
          <div className="active-filter-tags">
            <span>
              Showing <strong>{filteredReminders.length}</strong> of {reminders.length} reminders
            </span>
            {searchTerm && (
              <span className="active-filter-badge">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm('')}>
                  <FaTimes />
                </button>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="active-filter-badge">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus('all')}>
                  <FaTimes />
                </button>
              </span>
            )}
            {filterPriority !== 'all' && (
              <span className="active-filter-badge">
                Priority: {filterPriority}
                <button onClick={() => setFilterPriority('all')}>
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
          </div>
        </div>
      </div>

      {/* Reminders List */}
      {loading ? (
        <div className="reminders-list">
          {[1, 2, 3].map((n) => (
            <div key={n} className="reminders-skeleton-card">
              <div className="skeleton-line" style={{ width: '45%' }}></div>
              <div className="skeleton-line" style={{ width: '80%' }}></div>
              <div className="skeleton-line" style={{ width: '35%', height: '12px' }}></div>
            </div>
          ))}
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="reminders-empty-state">
          <div className="empty-icon-circle">
            <FaBell />
          </div>
          <h3 className="empty-title">
            {isAnyFilterActive ? 'No matching reminders found' : 'No reminders or follow-ups yet'}
          </h3>
          <p className="empty-subtitle">
            {isAnyFilterActive
              ? `We couldn't find any reminders matching your search and filter criteria. Try resetting your query.`
              : `Keep your sales momentum by scheduling reminders, callbacks, and site visits.`}
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
              className="btn-add-reminder"
              style={{ marginTop: '10px' }}
            >
              <FaPlus /> Add Your First Reminder
            </button>
          )}
        </div>
      ) : (
        <div className="reminders-list">
          {filteredReminders.map((reminder) => {
            const isCompleted = reminder.status === 'completed';
            const isOverdue = reminder.status === 'overdue';
            const typeConf = TYPE_CONFIG[reminder.type] || TYPE_CONFIG['follow-up'];
            const TypeIcon = typeConf.icon;
            const dueInfo = getDueInfo(reminder.dueDate, reminder.status);
            const leadId = reminder.Lead?._id || reminder.Lead;
            const leadName = reminder.Lead?.name || (reminder.Lead ? 'Lead' : 'General Reminder');
            const company = reminder.Lead?.company;

            return (
              <div
                key={reminder._id}
                className={`reminder-card ${isCompleted ? 'completed' : ''}`}
                style={{ borderLeft: `4px solid ${getBorderColor(reminder)}` }}
              >
                {/* Header Row */}
                <div className="reminder-card-header">
                  <div className="reminder-info-main">
                    <div className="reminder-title-row">
                      <h3
                        className={`reminder-title-text ${isCompleted ? 'completed' : ''}`}
                      >
                        <HighlightText text={reminder.title} search={searchTerm} />
                      </h3>

                      {/* Priority Badge */}
                      <span className={`reminder-pill priority-${reminder.priority || 'medium'}`}>
                        {reminder.priority || 'medium'}
                      </span>

                      {/* Status Badge */}
                      <span className={`reminder-pill status-${reminder.status || 'pending'}`}>
                        {isOverdue && <FaExclamationTriangle size={11} />}
                        {isCompleted && <FaCheck size={11} />}
                        {reminder.status || 'pending'}
                      </span>

                      {/* Type Badge */}
                      <span className="reminder-pill type-badge">
                        <TypeIcon size={11} style={{ color: typeConf.color }} />
                        {typeConf.label}
                      </span>
                    </div>

                    {/* Description */}
                    {reminder.description && (
                      <p className="reminder-desc-text">
                        <HighlightText text={reminder.description} search={searchTerm} />
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="reminder-card-actions">
                    {!isCompleted ? (
                      <button
                        onClick={() => handleComplete(reminder._id)}
                        className="action-rem-btn complete"
                        title="Mark as completed"
                      >
                        <FaCheck size={12} /> Complete
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReopen(reminder._id)}
                        className="action-rem-btn reopen"
                        title="Reopen reminder"
                      >
                        <FaRedo size={11} /> Reopen
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEdit(reminder)}
                      className="action-rem-btn edit"
                      title="Edit reminder"
                    >
                      <FaEdit size={12} /> Edit
                    </button>

                    <button
                      onClick={() => deleteReminder(reminder._id)}
                      className="action-rem-btn delete"
                      title="Delete reminder"
                    >
                      <FaTrash size={12} /> Delete
                    </button>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="reminder-meta-bar">
                  <div className="reminder-lead-meta">
                    <span
                      className="reminder-lead-link"
                      onClick={() => leadId && navigate(`/Leads/${leadId}`)}
                      title={leadId ? `Go to lead profile: ${leadName}` : undefined}
                      style={{ cursor: leadId ? 'pointer' : 'default' }}
                    >
                      <FaUser size={12} color="#64748b" />
                      <HighlightText text={leadName} search={searchTerm} />
                      {leadId && <FaExternalLinkAlt className="lead-link-icon" />}
                    </span>

                    {company && (
                      <span className="reminder-company-tag">
                        <FaBuilding size={11} />
                        <HighlightText text={company} search={searchTerm} />
                      </span>
                    )}
                  </div>

                  <div className="reminder-timing-meta">
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                      title="Due Date & Time"
                    >
                      <FaCalendarAlt size={12} />
                      <span>{formatDueDate(reminder.dueDate)}</span>
                    </div>

                    <span className={`due-countdown-tag ${dueInfo.className}`}>
                      {dueInfo.text}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Reminder Modal */}
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
                  <h2 className="modal-title">Add New Reminder</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Schedule a follow-up, call, or task for your leads
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

            <form onSubmit={handleAddReminder}>
              {/* Select Lead */}
              <div className="form-group-custom">
                <label className="form-label-custom">Select Lead *</label>
                <select
                  value={newReminder.Lead}
                  onChange={(e) => setNewReminder({ ...newReminder, Lead: e.target.value })}
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

              {/* Quick Preset Templates */}
              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontSize: '12px', color: '#64748b' }}>
                  <FaLightbulb style={{ marginRight: '5px', color: '#f59e0b' }} />
                  Quick Presets (Click to autofill)
                </label>
                <div className="quick-templates-wrap">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="template-chip"
                      onClick={() => handleApplyTemplate(tmpl)}
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reminder Title */}
              <div className="form-group-custom">
                <label className="form-label-custom">Reminder Title *</label>
                <input
                  type="text"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  placeholder="e.g. Follow up on commercial contract proposal"
                  className="form-input-custom"
                  required
                />
              </div>

              {/* Type Picker */}
              <div className="form-group-custom">
                <label className="form-label-custom">Reminder Type</label>
                <div className="type-buttons-selector">
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = newReminder.type === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`type-select-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setNewReminder({ ...newReminder, type: key })}
                        style={{
                          borderColor: isSelected ? config.color : undefined,
                          background: isSelected ? config.bg : undefined,
                          color: isSelected ? config.color : undefined,
                        }}
                      >
                        <Icon size={14} />
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Picker */}
              <div className="form-group-custom">
                <label className="form-label-custom">Priority Level</label>
                <div className="priority-selector-grid">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                    const isSelected = newReminder.priority === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`priority-opt-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setNewReminder({ ...newReminder, priority: key })}
                        style={{
                          borderColor: isSelected ? config.color : undefined,
                          background: isSelected ? config.bg : undefined,
                          color: isSelected ? config.color : undefined,
                        }}
                      >
                        ● {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due Date & Time */}
              <div className="form-group-custom">
                <label className="form-label-custom">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  value={newReminder.dueDate}
                  onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
                  className="form-input-custom"
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group-custom">
                <label className="form-label-custom">Optional Notes / Description</label>
                <textarea
                  value={newReminder.description}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, description: e.target.value })
                  }
                  placeholder="Additional context or checklist items..."
                  rows="3"
                  className="form-textarea-custom"
                />
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
                    {saving ? 'Adding...' : 'Add Reminder'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reminder Modal */}
      {showEditModal && editingReminder && (
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
                  <h2 className="modal-title">Edit Reminder</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Lead: <strong>{editingReminder.leadName}</strong>
                    {editingReminder.company ? ` (${editingReminder.company})` : ''}
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

            <form onSubmit={handleUpdateReminder}>
              {/* Title */}
              <div className="form-group-custom">
                <label className="form-label-custom">Reminder Title *</label>
                <input
                  type="text"
                  value={editingReminder.title}
                  onChange={(e) =>
                    setEditingReminder({ ...editingReminder, title: e.target.value })
                  }
                  className="form-input-custom"
                  required
                />
              </div>

              {/* Type */}
              <div className="form-group-custom">
                <label className="form-label-custom">Reminder Type</label>
                <div className="type-buttons-selector">
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = editingReminder.type === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`type-select-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() =>
                          setEditingReminder({ ...editingReminder, type: key })
                        }
                        style={{
                          borderColor: isSelected ? config.color : undefined,
                          background: isSelected ? config.bg : undefined,
                          color: isSelected ? config.color : undefined,
                        }}
                      >
                        <Icon size={14} />
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div className="form-group-custom">
                <label className="form-label-custom">Priority Level</label>
                <div className="priority-selector-grid">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                    const isSelected = editingReminder.priority === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`priority-opt-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() =>
                          setEditingReminder({ ...editingReminder, priority: key })
                        }
                        style={{
                          borderColor: isSelected ? config.color : undefined,
                          background: isSelected ? config.bg : undefined,
                          color: isSelected ? config.color : undefined,
                        }}
                      >
                        ● {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="form-group-custom">
                <label className="form-label-custom">Status</label>
                <select
                  value={editingReminder.status}
                  onChange={(e) =>
                    setEditingReminder({ ...editingReminder, status: e.target.value })
                  }
                  className="form-select-custom"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="form-group-custom">
                <label className="form-label-custom">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  value={editingReminder.dueDate}
                  onChange={(e) =>
                    setEditingReminder({ ...editingReminder, dueDate: e.target.value })
                  }
                  className="form-input-custom"
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group-custom">
                <label className="form-label-custom">Notes / Description</label>
                <textarea
                  value={editingReminder.description}
                  onChange={(e) =>
                    setEditingReminder({ ...editingReminder, description: e.target.value })
                  }
                  rows="3"
                  className="form-textarea-custom"
                />
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

export default Reminders;
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FaPhoneAlt, FaCalendarCheck, FaClock,
  FaUsers, FaFilter, FaSync, FaCheckCircle, FaMapMarkerAlt,
  FaSearch, FaTimes, FaWhatsapp, FaThList, FaThLarge,
  FaExclamationTriangle, FaChevronRight, FaRegCalendarAlt,
  FaFire, FaCheck, FaBuilding, FaComments, FaArrowUp, FaCalendarAlt
} from 'react-icons/fa';
import leadService from '../services/leadService';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import { useAuth } from '../hooks/useAuth';
import './TelecallerDashboard.css';

const STAGES = [
  { key: 'ALL', label: 'All Leads' },
  { key: 'NEW', label: 'New' },
  { key: 'CONNECTED', label: 'Connected' },
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'FOLLOW_UP', label: 'Follow-up' },
  { key: 'SITE_VISIT_PLANNED', label: 'Site Visit Planned' },
];

const STAGE_CONFIG = {
  NEW: { label: 'NEW', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  CONNECTED: { label: 'CONNECTED', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  INTERESTED: { label: 'INTERESTED', bg: '#fdf4ff', color: '#9333ea', border: '#f0abfc' },
  FOLLOW_UP: { label: 'FOLLOW UP', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  SITE_VISIT_PLANNED: { label: 'SITE VISIT PLANNED', bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' },
  SITE_VISIT_DONE: { label: 'VISIT DONE', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  QUOTATION: { label: 'QUOTATION', bg: '#fefce8', color: '#a16207', border: '#fef08a' },
  CONVERTED: { label: 'CONVERTED', bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};

const getFollowUpStatus = (dateStr) => {
  if (!dateStr) {
    return { type: 'none', label: '-', color: '#94a3b8', bg: '#f8fafc', icon: null };
  }

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return { type: 'none', label: '-', color: '#94a3b8', bg: '#f8fafc', icon: null };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrowStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const formatted = d.toLocaleDateString('en-GB');

  if (d < todayStart) {
    return {
      type: 'overdue',
      label: `Overdue (${formatted})`,
      color: '#dc2626',
      bg: '#fee2e2',
      icon: FaExclamationTriangle
    };
  }
  if (d >= todayStart && d < tomorrowStart) {
    return {
      type: 'today',
      label: `Due Today (${formatted})`,
      color: '#d97706',
      bg: '#fef3c7',
      icon: FaClock
    };
  }
  if (d >= tomorrowStart && d < dayAfterTomorrow) {
    return {
      type: 'tomorrow',
      label: `Tomorrow (${formatted})`,
      color: '#2563eb',
      bg: '#dbeafe',
      icon: FaCalendarAlt
    };
  }
  return {
    type: 'upcoming',
    label: formatted,
    color: '#475569',
    bg: '#f1f5f9',
    icon: FaCalendarAlt
  };
};

const TelecallerDashboard = () => {
  const { user } = useAuth();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leadDetail, setLeadDetail] = useState(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');
  const [filterFollowUp, setFilterFollowUp] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [sortBy, setSortBy] = useState('next_call_asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'

  // Quick Advance Stage Modal State
  const [advanceModal, setAdvanceModal] = useState({
    isOpen: false,
    lead: null,
    targetStage: 'CONNECTED',
    followUpDate: '',
    notes: '',
    saving: false
  });

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await leadService.getMyLeads();
      setLeads(res.data?.data || []);
      if (isSilent) toast.success('Leads refreshed!');
    } catch (error) {
      toast.error('Unable to load your leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openLead = async (lead) => {
    try {
      const res = await leadService.getLead(lead._id);
      setLeadDetail(res.data?.data);
    } catch (error) {
      toast.error('Unable to load lead details');
    }
  };

  const refreshDetail = async () => {
    if (leadDetail?.lead?._id) {
      const res = await leadService.getLead(leadDetail.lead._id);
      setLeadDetail(res.data?.data);
    }
    load(true);
  };

  // Quick Stage Advancement Action
  const handleOpenAdvance = (lead, defaultStage = null) => {
    const nextStage = defaultStage || (
      lead.pipelineStage === 'NEW' ? 'CONNECTED' :
      lead.pipelineStage === 'CONNECTED' ? 'INTERESTED' :
      lead.pipelineStage === 'INTERESTED' ? 'FOLLOW_UP' :
      lead.pipelineStage === 'FOLLOW_UP' ? 'SITE_VISIT_PLANNED' : 'CONNECTED'
    );

    setAdvanceModal({
      isOpen: true,
      lead,
      targetStage: nextStage,
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
      notes: '',
      saving: false
    });
  };

  const submitAdvanceStage = async () => {
    if (!advanceModal.lead) return;
    setAdvanceModal((prev) => ({ ...prev, saving: true }));

    try {
      const payload = {
        stage: advanceModal.targetStage,
        notes: advanceModal.notes.trim() || undefined,
        followUpDate: advanceModal.followUpDate || undefined
      };

      await leadService.updateStage(advanceModal.lead._id, payload);
      toast.success(`Lead advanced to ${advanceModal.targetStage.replace(/_/g, ' ')}!`);
      setAdvanceModal({ isOpen: false, lead: null, targetStage: 'CONNECTED', followUpDate: '', notes: '', saving: false });
      load(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to advance stage');
      setAdvanceModal((prev) => ({ ...prev, saving: false }));
    }
  };

  // Stage counts calculations
  const newCount = useMemo(() => leads.filter((l) => l.pipelineStage === 'NEW').length, [leads]);
  const connectedCount = useMemo(() => leads.filter((l) => l.pipelineStage === 'CONNECTED').length, [leads]);
  const interestedCount = useMemo(() => leads.filter((l) => l.pipelineStage === 'INTERESTED').length, [leads]);
  const followUpCount = useMemo(() => leads.filter((l) => l.pipelineStage === 'FOLLOW_UP').length, [leads]);
  const siteVisitPlannedCount = useMemo(() => leads.filter((l) => l.pipelineStage === 'SITE_VISIT_PLANNED').length, [leads]);

  // Overdue count
  const overdueCount = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return leads.filter((l) => l.followUpDate && new Date(l.followUpDate) < todayStart).length;
  }, [leads]);

  // Available sources for filter dropdown
  const availableSources = useMemo(() => {
    const s = new Set(leads.map((l) => l.source).filter(Boolean));
    return ['ALL', ...Array.from(s)];
  }, [leads]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // 1. Text Search Filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => {
        const name = (l.name || '').toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        const company = (l.company || '').toLowerCase();
        const city = (l.address?.city || '').toLowerCase();
        const street = (l.address?.street || '').toLowerCase();
        const notes = (l.notes || '').toLowerCase();
        const source = (l.source || '').toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          company.includes(q) ||
          city.includes(q) ||
          street.includes(q) ||
          notes.includes(q) ||
          source.includes(q)
        );
      });
    }

    // 2. Pipeline Stage Filter
    if (filterStage !== 'ALL') {
      result = result.filter((l) => l.pipelineStage === filterStage);
    }

    // 3. Follow-up / Next Call Schedule Filter
    if (filterFollowUp !== 'ALL') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const dayAfterTomorrow = new Date(tomorrowStart);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      result = result.filter((l) => {
        if (!l.followUpDate) return filterFollowUp === 'UNSCHEDULED';
        const d = new Date(l.followUpDate);
        if (filterFollowUp === 'OVERDUE') return d < todayStart;
        if (filterFollowUp === 'TODAY') return d >= todayStart && d < tomorrowStart;
        if (filterFollowUp === 'TOMORROW') return d >= tomorrowStart && d < dayAfterTomorrow;
        if (filterFollowUp === 'UPCOMING') return d >= dayAfterTomorrow;
        return true;
      });
    }

    // 4. Source Filter
    if (filterSource !== 'ALL') {
      result = result.filter((l) => (l.source || '').toLowerCase() === filterSource.toLowerCase());
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === 'next_call_asc') {
        if (!a.followUpDate && !b.followUpDate) return 0;
        if (!a.followUpDate) return 1;
        if (!b.followUpDate) return -1;
        return new Date(a.followUpDate) - new Date(b.followUpDate);
      }
      if (sortBy === 'next_call_desc') {
        if (!a.followUpDate && !b.followUpDate) return 0;
        if (!a.followUpDate) return 1;
        if (!b.followUpDate) return -1;
        return new Date(b.followUpDate) - new Date(a.followUpDate);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'recent') {
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      }
      return 0;
    });

    return result;
  }, [leads, search, filterStage, filterFollowUp, filterSource, sortBy]);

  const hasActiveFilters = Boolean(
    search.trim() ||
    filterStage !== 'ALL' ||
    filterFollowUp !== 'ALL' ||
    filterSource !== 'ALL' ||
    sortBy !== 'next_call_asc'
  );

  const resetFilters = () => {
    setSearch('');
    setFilterStage('ALL');
    setFilterFollowUp('ALL');
    setFilterSource('ALL');
    setSortBy('next_call_asc');
  };

  return (
    <div className="tcd-container">
      {/* Top Header */}
      <div className="tcd-header">
        <div className="tcd-title-group">
          <div className="tcd-icon-box">📞</div>
          <div>
            <h1 className="tcd-title">Telecaller Operations Dashboard</h1>
            <p className="tcd-subtitle">
              Engage customer prospects, record call feedback notes, schedule follow-ups, and advance leads to Site Visit Planned.
            </p>
          </div>
        </div>

        <button onClick={() => load(true)} className="tcd-refresh-btn" disabled={refreshing}>
          <FaSync className={refreshing ? 'fa-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh Leads'}
        </button>
      </div>

      {/* KPI Cards Grid (Interactive Click to Filter) */}
      <div className="tcd-kpi-grid">
        {/* 1. Total Assigned Leads */}
        <div
          className={`tcd-kpi-card ${filterStage === 'ALL' && filterFollowUp === 'ALL' && !search ? 'active' : ''}`}
          onClick={() => { resetFilters(); setFilterStage('ALL'); }}
          title="Click to view all leads"
        >
          <div className="tcd-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FaUsers />
          </div>
          <div>
            <div className="tcd-kpi-val">{leads.length}</div>
            <div className="tcd-kpi-label">Assigned Leads</div>
            <div className="tcd-kpi-sub">Total Portfolio</div>
          </div>
        </div>

        {/* 2. Active Calling */}
        <div
          className={`tcd-kpi-card ${['NEW', 'CONNECTED', 'INTERESTED'].includes(filterStage) ? 'active' : ''}`}
          onClick={() => { resetFilters(); setFilterStage('CONNECTED'); }}
          title="Click to view active calling queue"
        >
          <div className="tcd-kpi-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <FaPhoneAlt />
          </div>
          <div>
            <div className="tcd-kpi-val">{newCount + connectedCount + interestedCount}</div>
            <div className="tcd-kpi-label">Active Calling</div>
            <div className="tcd-kpi-sub">New, Connected & Interested</div>
          </div>
        </div>

        {/* 3. Pending Follow-ups */}
        <div
          className={`tcd-kpi-card ${filterStage === 'FOLLOW_UP' ? 'active' : ''}`}
          onClick={() => { resetFilters(); setFilterStage('FOLLOW_UP'); }}
          title="Click to view follow-ups"
        >
          <div className="tcd-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <FaClock />
          </div>
          <div>
            <div className="tcd-kpi-val">{followUpCount}</div>
            <div className="tcd-kpi-label">Pending Follow-ups</div>
            <div className="tcd-kpi-sub">Call Backs Scheduled</div>
          </div>
        </div>

        {/* 4. Overdue Attention */}
        <div
          className={`tcd-kpi-card ${filterFollowUp === 'OVERDUE' ? 'active' : ''}`}
          onClick={() => { resetFilters(); setFilterFollowUp('OVERDUE'); }}
          title="Click to view overdue calls"
        >
          <div className="tcd-kpi-icon" style={{ background: overdueCount > 0 ? '#fee2e2' : '#f1f5f9', color: overdueCount > 0 ? '#dc2626' : '#64748b' }}>
            <FaExclamationTriangle />
          </div>
          <div>
            <div className="tcd-kpi-val" style={{ color: overdueCount > 0 ? '#dc2626' : '#0f172a' }}>{overdueCount}</div>
            <div className="tcd-kpi-label">Overdue Calls</div>
            <div className="tcd-kpi-sub">Need Immediate Attention</div>
          </div>
        </div>

        {/* 5. Site Visit Planned */}
        <div
          className={`tcd-kpi-card ${filterStage === 'SITE_VISIT_PLANNED' ? 'active' : ''}`}
          onClick={() => { resetFilters(); setFilterStage('SITE_VISIT_PLANNED'); }}
          title="Click to view leads ready for site visit"
        >
          <div className="tcd-kpi-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <FaMapMarkerAlt />
          </div>
          <div>
            <div className="tcd-kpi-val">{siteVisitPlannedCount}</div>
            <div className="tcd-kpi-label">Site Visit Planned</div>
            <div className="tcd-kpi-sub">Qualified for Field Inspection</div>
          </div>
        </div>
      </div>

      {/* Role Connectivity Information Notice */}
      <div className="tcd-notice-banner">
        <FaCheckCircle size={18} color="#16a34a" style={{ flexShrink: 0 }} />
        <div>
          <strong>Role Workflow Rule:</strong> Telecallers qualify and advance prospects up to <strong>Site Visit Planned</strong>.
          Once marked for a visit, your Team Manager is automatically notified to assign an available Field Sales Executive.
        </div>
      </div>

      {/* Search and Advanced Filters Control Center */}
      <div className="tcd-controls-panel">
        {/* Row 1: Search & Dropdowns */}
        <div className="tcd-search-row">
          {/* Search Box */}
          <div className="tcd-search-box">
            <FaSearch color="#94a3b8" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lead name, phone, company, location, notes..."
              className="tcd-search-input"
            />
            {search && (
              <button onClick={() => setSearch('')} className="tcd-search-clear" title="Clear search">
                <FaTimes size={12} />
              </button>
            )}
          </div>

          {/* Follow-up Schedule Filter */}
          <select
            value={filterFollowUp}
            onChange={(e) => setFilterFollowUp(e.target.value)}
            className="tcd-select"
            title="Filter by follow-up schedule"
          >
            <option value="ALL">📅 All Next Calls</option>
            <option value="OVERDUE">🚨 Overdue ({overdueCount})</option>
            <option value="TODAY">⏰ Due Today</option>
            <option value="TOMORROW">📆 Due Tomorrow</option>
            <option value="UPCOMING">📅 Upcoming</option>
            <option value="UNSCHEDULED">⏳ Not Scheduled</option>
          </select>

          {/* Lead Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="tcd-select"
            title="Filter by lead source"
          >
            <option value="ALL">🌐 All Sources</option>
            {availableSources.filter((s) => s !== 'ALL').map((src) => (
              <option key={src} value={src}>
                {src.charAt(0).toUpperCase() + src.slice(1).replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="tcd-select"
            title="Sort leads list"
          >
            <option value="next_call_asc">⏰ Next Call: Earliest First</option>
            <option value="next_call_desc">📅 Next Call: Latest First</option>
            <option value="name_asc">🔤 Name: A → Z</option>
            <option value="recent">⚡ Most Recently Updated</option>
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button onClick={resetFilters} className="tcd-reset-btn" title="Reset all search & filters">
              <FaTimes size={11} /> Reset Filters
            </button>
          )}
        </div>

        {/* Row 2: Stage Tabs & View Toggle */}
        <div className="tcd-tabs-row">
          <div className="tcd-stage-tabs">
            {STAGES.map((tab) => {
              const count =
                tab.key === 'ALL' ? leads.length :
                tab.key === 'NEW' ? newCount :
                tab.key === 'CONNECTED' ? connectedCount :
                tab.key === 'INTERESTED' ? interestedCount :
                tab.key === 'FOLLOW_UP' ? followUpCount :
                tab.key === 'SITE_VISIT_PLANNED' ? siteVisitPlannedCount : 0;

              return (
                <button
                  key={tab.key}
                  onClick={() => setFilterStage(tab.key)}
                  className={`tcd-stage-tab ${filterStage === tab.key ? 'active' : ''}`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Showing {filteredLeads.length} of {leads.length} leads
            </span>
            <div className="tcd-view-toggle">
              <button
                onClick={() => setViewMode('table')}
                className={`tcd-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                title="Table View"
              >
                <FaThList size={12} /> Table
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`tcd-view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                title="Kanban Board View"
              >
                <FaThLarge size={12} /> Kanban
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <FaSync className="fa-spin" size={24} style={{ color: '#2563eb', marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>Loading telecaller operations queue...</div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
            No leads match your search or filter
          </h3>
          <p style={{ fontSize: '13px', margin: 0, color: '#64748b' }}>
            {hasActiveFilters ? 'Try adjusting your search query, stage tab, or schedule filters.' : 'Leads will appear here as soon as they are assigned by your team manager.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              style={{
                marginTop: '16px',
                padding: '8px 18px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Enhanced Table View */
        <div className="tcd-table-card">
          <table className="tcd-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Customer Lead</th>
                <th style={{ width: '22%' }}>Contact & Connect</th>
                <th style={{ width: '18%' }}>Pipeline Stage</th>
                <th style={{ width: '18%' }}>Next Scheduled Call</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const stageBadge = STAGE_CONFIG[lead.pipelineStage] || { label: lead.pipelineStage, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
                const followUp = getFollowUpStatus(lead.followUpDate);
                const rawPhone = (lead.phone || '').replace(/\D/g, '');

                return (
                  <tr key={lead._id}>
                    {/* Column 1: Customer Lead */}
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                        {lead.name}
                      </div>
                      {lead.company && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          <FaBuilding size={10} color="#94a3b8" /> {lead.company}
                        </div>
                      )}
                      {(lead.address?.city || lead.address?.street) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          <FaMapMarkerAlt size={9} /> {lead.address?.city || lead.address?.street}
                        </div>
                      )}
                      {lead.source && (
                        <span style={{ display: 'inline-block', marginTop: '4px', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 600 }}>
                          via {lead.source}
                        </span>
                      )}
                    </td>

                    {/* Column 2: Contact & Direct Actions */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px', marginBottom: '6px' }}>
                        {lead.phone || 'No phone'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {lead.phone && (
                          <>
                            <a
                              href={`tel:${lead.phone}`}
                              className="tcd-call-btn"
                              title="Direct Phone Call"
                            >
                              <FaPhoneAlt size={10} /> Call
                            </a>
                            <a
                              href={`https://wa.me/91${rawPhone}?text=Hello%20${encodeURIComponent(lead.name)},%20this%20is%20${encodeURIComponent(user?.name || 'Sungrid Energy')}%20regarding%20your%20property%20inquiry.`}
                              target="_blank"
                              rel="noreferrer"
                              className="tcd-wa-btn"
                              title="Chat on WhatsApp"
                            >
                              <FaWhatsapp size={12} /> WhatsApp
                            </a>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Column 3: Pipeline Stage */}
                    <td>
                      <span
                        className="tcd-stage-badge"
                        style={{
                          background: stageBadge.bg,
                          color: stageBadge.color,
                          border: `1px solid ${stageBadge.border}`
                        }}
                      >
                        {stageBadge.label}
                      </span>
                    </td>

                    {/* Column 4: Next Scheduled Call */}
                    <td>
                      <span
                        className="tcd-next-call-pill"
                        style={{ background: followUp.bg, color: followUp.color }}
                      >
                        {followUp.icon && <followUp.icon size={11} />}
                        {followUp.label}
                      </span>
                    </td>

                    {/* Column 5: Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleOpenAdvance(lead)}
                          className="tcd-advance-btn"
                          title="Advance stage or update call schedule"
                        >
                          <FaArrowUp size={10} color="#2563eb" /> Advance
                        </button>
                        <button
                          onClick={() => openLead(lead)}
                          className="tcd-open-btn"
                          title="Open full lead details and call notes"
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Enhanced Kanban Board View */
        <div className="tcd-kanban-board">
          {['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED'].map((stageKey) => {
            const stageLeads = filteredLeads.filter((l) => l.pipelineStage === stageKey);
            const badge = STAGE_CONFIG[stageKey];

            return (
              <div key={stageKey} className="tcd-kanban-col">
                <div className="tcd-kanban-header">
                  <span className="tcd-kanban-title" style={{ color: badge.color }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: badge.color }} />
                    {badge.label}
                  </span>
                  <span className="tcd-kanban-count">{stageLeads.length}</span>
                </div>

                <div className="tcd-kanban-list">
                  {stageLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '12px', background: '#ffffff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                      No leads in {badge.label}
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const followUp = getFollowUpStatus(lead.followUpDate);
                      const rawPhone = (lead.phone || '').replace(/\D/g, '');

                      return (
                        <div key={lead._id} className="tcd-kanban-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div>
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{lead.name}</strong>
                              {lead.company && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  {lead.company}
                                </div>
                              )}
                            </div>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: badge.bg, color: badge.color, fontSize: '10px', fontWeight: 700 }}>
                              {badge.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                            <span>📞 {lead.phone}</span>
                            {followUp.type !== 'none' && (
                              <span style={{ padding: '2px 6px', borderRadius: '4px', background: followUp.bg, color: followUp.color, fontWeight: 600 }}>
                                {followUp.label}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="tcd-call-btn" style={{ padding: '3px 8px', fontSize: '11px' }}>
                                <FaPhoneAlt size={9} /> Call
                              </a>
                            )}
                            {lead.phone && (
                              <a
                                href={`https://wa.me/91${rawPhone}?text=Hello%20${encodeURIComponent(lead.name)},%20this%20is%20${encodeURIComponent(user?.name || 'Sungrid Energy')}.`}
                                target="_blank"
                                rel="noreferrer"
                                className="tcd-wa-btn"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                              >
                                <FaWhatsapp size={10} />
                              </a>
                            )}
                            <button
                              onClick={() => handleOpenAdvance(lead)}
                              style={{ flex: 1, padding: '4px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#334155' }}
                            >
                              Advance
                            </button>
                            <button
                              onClick={() => openLead(lead)}
                              style={{ padding: '4px 8px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Advance Stage Modal */}
      {advanceModal.isOpen && advanceModal.lead && (
        <div className="tcd-modal-overlay">
          <div className="tcd-modal-box">
            <div className="tcd-modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Advance Lead Stage: {advanceModal.lead.name}
              </h3>
              <button
                onClick={() => setAdvanceModal({ isOpen: false, lead: null, targetStage: 'CONNECTED', followUpDate: '', notes: '', saving: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="tcd-modal-body">
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Select Target Pipeline Stage:
                </label>
                <select
                  value={advanceModal.targetStage}
                  onChange={(e) => setAdvanceModal((prev) => ({ ...prev, targetStage: e.target.value }))}
                  className="tcd-select"
                  style={{ width: '100%' }}
                >
                  <option value="CONNECTED">CONNECTED — Spoke with prospect</option>
                  <option value="INTERESTED">INTERESTED — Prospect shown genuine interest</option>
                  <option value="FOLLOW_UP">FOLLOW_UP — Callback requested</option>
                  <option value="SITE_VISIT_PLANNED">SITE_VISIT_PLANNED — Customer agreed for site inspection</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Next Call / Follow-up Date (Optional):
                </label>
                <input
                  type="date"
                  value={advanceModal.followUpDate}
                  onChange={(e) => setAdvanceModal((prev) => ({ ...prev, followUpDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Call Feedback / Remark Note (Optional):
                </label>
                <textarea
                  value={advanceModal.notes}
                  onChange={(e) => setAdvanceModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Record customer reaction, budget, requirement details, or callback reason..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <div className="tcd-modal-footer">
              <button
                onClick={() => setAdvanceModal({ isOpen: false, lead: null, targetStage: 'CONNECTED', followUpDate: '', notes: '', saving: false })}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={submitAdvanceStage}
                disabled={advanceModal.saving}
                style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {advanceModal.saving ? 'Updating...' : 'Save & Advance Stage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Lead Details Modal */}
      {leadDetail && (
        <LeadDetailModal
          leadDetail={leadDetail}
          onClose={() => setLeadDetail(null)}
          onUpdated={refreshDetail}
        />
      )}
    </div>
  );
};

export default TelecallerDashboard;

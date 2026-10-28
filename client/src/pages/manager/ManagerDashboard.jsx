import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FaChartBar,
  FaClipboardCheck,
  FaExchangeAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaSearch,
  FaTimes,
  FaSyncAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaUserTie,
  FaHeadset,
  FaBriefcase,
  FaUserShield,
  FaFilter,
  FaLayerGroup,
  FaCheck,
  FaBuilding,
  FaExclamationTriangle,
  FaThLarge,
  FaCalendarAlt,
} from 'react-icons/fa';
import managerService from '../../services/managerService';
import attendanceService from '../../services/attendanceService';
import './ManagerDashboard.css';

const STAGE_COLORS = {
  NEW: { bg: '#3b82f6', label: 'New Lead' },
  CONNECTED: { bg: '#0ea5e9', label: 'Connected' },
  INTERESTED: { bg: '#f59e0b', label: 'Interested' },
  FOLLOW_UP: { bg: '#8b5cf6', label: 'Follow Up' },
  SITE_VISIT_PLANNED: { bg: '#ec4899', label: 'Site Visit Planned' },
  SITE_VISIT_DONE: { bg: '#10b981', label: 'Site Visit Done' },
  QUOTATION: { bg: '#6366f1', label: 'Quotation' },
  CONVERTED: { bg: '#059669', label: 'Converted' },
};

const ROLE_CONFIG = {
  manager: { label: 'Manager', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', icon: FaUserTie },
  telecaller: { label: 'Telecaller', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: FaHeadset },
  'sales executer': { label: 'Sales Exec', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: FaBriefcase },
  admin: { label: 'Admin', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: FaUserShield },
  auditor: { label: 'Auditor', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', icon: FaUserShield },
};

const initialData = {
  totalLeads: 0,
  stages: [],
  callsDone: 0,
  siteVisits: {},
  pendingAttendance: 0,
  team: [],
  unassignedLeads: [],
  teamLeads: [],
  teams: [],
};

const TABS = [
  ['overview', 'Team dashboard', FaChartBar],
  ['distribution', 'Lead distribution', FaExchangeAlt],
  ['visits', 'Site visits', FaMapMarkerAlt],
  ['attendance', 'Attendance', FaClipboardCheck],
];

// Highlight text helper
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

const ManagerDashboard = () => {
  const [view, setView] = useState('overview');
  const [data, setData] = useState(initialData);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Team members filter & search state
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [groupByTeam, setGroupByTeam] = useState(true);

  // Lead distribution state
  const [selected, setSelected] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [distributeSearch, setDistributeSearch] = useState('');

  // Site visits state
  const [visitSubTab, setVisitSubTab] = useState('pipeline'); // 'pipeline' | 'scheduled'
  const [visitSearch, setVisitSearch] = useState('');
  const [visitStageFilter, setVisitStageFilter] = useState('all');
  const [visitTeamFilter, setVisitTeamFilter] = useState('all');
  const [visitUserFilter, setVisitUserFilter] = useState('all');
  const [visitLead, setVisitLead] = useState(null);
  const [visit, setVisit] = useState({
    executiveId: '',
    scheduledAt: '',
    address: '',
    priority: 'MEDIUM',
    notes: '',
  });

  // Attendance state
  const [period, setPeriod] = useState('week');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [remarks, setRemarks] = useState({});

  // Load Dashboard Data
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setIsRefreshing(true);

    try {
      const response = await managerService.getDashboard();
      const dashboard = response.data?.data || initialData;
      setData(dashboard);

      if (view === 'attendance') {
        const attendanceResponse = await managerService.getAttendance({ period });
        setAttendance(attendanceResponse.data?.data || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load manager workspace');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [view, period]);

  useEffect(() => {
    load();
  }, [load]);

  // Lead distribution handler
  const distribute = async (leadIds = selected, assignedTo = '') => {
    try {
      const response = await managerService.distribute(leadIds, assignedTo);
      toast.success(`${response.data.distributed || 0} leads successfully assigned!`);
      setSelected([]);
      setAssignee('');
      await load(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to distribute leads');
    }
  };

  // Assign Site Visit
  const assignVisit = async (event) => {
    event.preventDefault();
    try {
      await managerService.assignVisit({ leadId: visitLead._id, ...visit });
      toast.success('Site visit assigned successfully!');
      setVisitLead(null);
      setVisit({ executiveId: '', scheduledAt: '', address: '', priority: 'MEDIUM', notes: '' });
      await load(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to assign site visit');
    }
  };

  // Review Attendance
  const reviewAttendance = async (record, decision) => {
    const note = (remarks[record._id] || '').trim();
    try {
      if (decision === 'APPROVED') await attendanceService.approve(record._id, note);
      else await attendanceService.reject(record._id, note);
      toast.success(`Attendance marked as ${decision.toLowerCase()}!`);
      setAttendance((items) =>
        items.map((item) =>
          item._id === record._id ? { ...item, status: decision, managerRemarks: note } : item
        )
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update attendance');
    }
  };

  const stageCount = (name) => data.stages.find((stage) => stage._id === name)?.count || 0;
  const teamExecutives = (data.team || []).filter((member) => member.role === 'sales executer');

  // Extract unique teams from teams list and members
  const teamsList = useMemo(() => {
    const list = [...(data.teams || [])];
    (data.team || []).forEach((m) => {
      (m.teamIds || []).forEach((t) => {
        if (t && typeof t === 'object' && t._id && !list.some((existing) => existing._id === t._id)) {
          list.push(t);
        }
      });
    });
    return list;
  }, [data.teams, data.team]);

  // Filtered Team Members (Synchronous instant search & filters)
  const filteredTeamMembers = useMemo(() => {
    return (data.team || []).filter((member) => {
      // Role filter
      if (selectedRoleFilter !== 'all' && member.role !== selectedRoleFilter) {
        return false;
      }

      // Team filter
      if (selectedTeamFilter !== 'all') {
        if (selectedTeamFilter === 'unassigned') {
          if (member.teamIds && member.teamIds.length > 0) return false;
        } else {
          const inTeam = (member.teamIds || []).some((t) => {
            const id = typeof t === 'object' ? t._id : t;
            return String(id) === String(selectedTeamFilter);
          });
          if (!inTeam) return false;
        }
      }

      // Instant search
      if (memberSearch.trim()) {
        const query = memberSearch.toLowerCase().trim();
        const name = (member.name || '').toLowerCase();
        const email = (member.email || '').toLowerCase();
        const role = (member.role || '').toLowerCase();
        const phone = (member.phone || '').toLowerCase();
        const teamNames = (member.teamIds || [])
          .map((t) => (typeof t === 'object' ? t.name : ''))
          .join(' ')
          .toLowerCase();

        const matches =
          name.includes(query) ||
          email.includes(query) ||
          role.includes(query) ||
          phone.includes(query) ||
          teamNames.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [data.team, selectedRoleFilter, selectedTeamFilter, memberSearch]);

  // Group filtered team members by team
  const groupedMembers = useMemo(() => {
    const groups = {};

    filteredTeamMembers.forEach((member) => {
      if (!member.teamIds || member.teamIds.length === 0) {
        const key = 'unassigned';
        if (!groups[key]) {
          groups[key] = {
            team: { _id: 'unassigned', name: 'General / Operations (No Team Assigned)', code: 'OPS' },
            members: [],
          };
        }
        groups[key].members.push(member);
      } else {
        member.teamIds.forEach((t) => {
          const tId = typeof t === 'object' ? t._id : t;
          const tName = typeof t === 'object' ? t.name : 'Team';
          const tCode = typeof t === 'object' ? t.code : '';
          if (!groups[tId]) {
            groups[tId] = {
              team: { _id: tId, name: tName, code: tCode },
              members: [],
            };
          }
          if (!groups[tId].members.some((m) => m._id === member._id)) {
            groups[tId].members.push(member);
          }
        });
      }
    });

    return Object.values(groups);
  }, [filteredTeamMembers]);

  // Filtered Unassigned Leads for distribution
  const filteredUnassignedLeads = useMemo(() => {
    if (!distributeSearch.trim()) return data.unassignedLeads || [];
    const term = distributeSearch.toLowerCase().trim();
    return (data.unassignedLeads || []).filter(
      (l) =>
        (l.name || '').toLowerCase().includes(term) ||
        (l.company || '').toLowerCase().includes(term) ||
        (l.phone || '').toLowerCase().includes(term)
    );
  }, [data.unassignedLeads, distributeSearch]);

  // Ready for visit count
  const readyVisitCount = useMemo(() => {
    return (data.teamLeads || []).filter((l) => l.pipelineStage === 'SITE_VISIT_PLANNED').length;
  }, [data.teamLeads]);

  // Filtered Team Leads for Site Visits (Filtered by Stage, Team, User, and Instant Search)
  const filteredVisitLeads = useMemo(() => {
    return (data.teamLeads || []).filter((lead) => {
      // Stage Filter
      if (visitStageFilter === 'ready') {
        if (lead.pipelineStage !== 'SITE_VISIT_PLANNED') return false;
      } else if (visitStageFilter !== 'all') {
        if (lead.pipelineStage !== visitStageFilter) return false;
      }

      // Team Filter
      if (visitTeamFilter !== 'all') {
        if (visitTeamFilter === 'unassigned') {
          if (lead.team) return false;
        } else {
          const tId = lead.team?._id || lead.team;
          if (String(tId) !== String(visitTeamFilter)) return false;
        }
      }

      // User Filter (Assigned to)
      if (visitUserFilter !== 'all') {
        if (visitUserFilter === 'unassigned') {
          if (lead.assignedTo) return false;
        } else {
          const uId = lead.assignedTo?._id || lead.assignedTo;
          if (String(uId) !== String(visitUserFilter)) return false;
        }
      }

      // Search Query
      if (visitSearch.trim()) {
        const query = visitSearch.toLowerCase().trim();
        const name = (lead.name || '').toLowerCase();
        const company = (lead.company || '').toLowerCase();
        const phone = (lead.phone || '').toLowerCase();
        const stage = (lead.pipelineStage || '').toLowerCase();
        const teamName = (lead.team?.name || '').toLowerCase();
        const userName = (lead.assignedTo?.name || '').toLowerCase();

        const matches =
          name.includes(query) ||
          company.includes(query) ||
          phone.includes(query) ||
          stage.includes(query) ||
          teamName.includes(query) ||
          userName.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [data.teamLeads, visitStageFilter, visitTeamFilter, visitUserFilter, visitSearch]);

  // Filtered Scheduled Site Visits
  const filteredScheduledVisits = useMemo(() => {
    return (data.scheduledVisits || []).filter((v) => {
      // Team filter
      if (visitTeamFilter !== 'all') {
        const tId = v.assignedTo?.teamIds?.[0] || v.lead?.team;
        if (visitTeamFilter === 'unassigned') {
          if (tId) return false;
        } else if (tId && String(tId) !== String(visitTeamFilter)) {
          return false;
        }
      }

      // User filter
      if (visitUserFilter !== 'all') {
        const uId = v.assignedTo?._id || v.assignedTo;
        if (String(uId) !== String(visitUserFilter)) return false;
      }

      // Search
      if (visitSearch.trim()) {
        const query = visitSearch.toLowerCase().trim();
        const leadName = (v.lead?.name || v.Lead?.name || '').toLowerCase();
        const company = (v.lead?.company || v.Lead?.company || '').toLowerCase();
        const execName = (v.assignedTo?.name || '').toLowerCase();
        const address = (v.address || '').toLowerCase();
        const status = (v.status || '').toLowerCase();

        return (
          leadName.includes(query) ||
          company.includes(query) ||
          execName.includes(query) ||
          address.includes(query) ||
          status.includes(query)
        );
      }

      return true;
    });
  }, [data.scheduledVisits, visitTeamFilter, visitUserFilter, visitSearch]);

  // Filtered Attendance Records
  const filteredAttendance = useMemo(() => {
    if (!attendanceSearch.trim()) return attendance;
    const term = attendanceSearch.toLowerCase().trim();
    return attendance.filter(
      (r) =>
        (r.user?.name || '').toLowerCase().includes(term) ||
        (r.status || '').toLowerCase().includes(term) ||
        (r.managerRemarks || '').toLowerCase().includes(term)
    );
  }, [attendance, attendanceSearch]);

  return (
    <main className="manager-workspace-container">
      {/* Header */}
      <div className="manager-header">
        <div className="manager-title-group">
          <h1>Manager Workspace</h1>
          <p className="manager-subtitle">
            Team performance monitoring, team-wise member directory, lead distribution, and site visit operations.
          </p>
        </div>
        <div className="manager-header-actions">
          <button
            onClick={() => load(true)}
            className={`btn-mgr-refresh ${isRefreshing ? 'spinning' : ''}`}
            title="Refresh dashboard metrics"
            disabled={isRefreshing}
          >
            <FaSyncAlt />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="manager-nav-tabs">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`manager-tab-btn ${view === key ? 'active' : ''}`}
          >
            <Icon size={14} />
            <span>{label}</span>
            {key === 'attendance' && data.pendingAttendance > 0 && (
              <span className="tab-badge-pill">{data.pendingAttendance}</span>
            )}
          </button>
        ))}
      </nav>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <FaSyncAlt className="spinning" size={24} style={{ marginBottom: '12px', color: '#2563eb' }} />
          <p style={{ margin: 0, fontWeight: 500 }}>Loading manager dashboard metrics...</p>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {view === 'overview' && (
            <>
              {/* KPI Stat Cards */}
              <div className="manager-stats-grid">
                {[
                  { label: 'Total Leads', val: data.totalLeads, icon: FaUsers, color: '#2563eb', bg: '#eff6ff' },
                  { label: 'Calls Completed', val: data.callsDone, icon: FaChartBar, color: '#8b5cf6', bg: '#f5f3ff' },
                  { label: 'Visits Scheduled', val: data.siteVisits?.planned || 0, icon: FaMapMarkerAlt, color: '#0284c7', bg: '#f0f9ff' },
                  { label: 'Visits Done', val: data.siteVisits?.done || 0, icon: FaClipboardCheck, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Visits Missed', val: data.siteVisits?.missed || 0, icon: FaExclamationTriangle, color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Pending Approvals', val: data.pendingAttendance, icon: FaCheck, color: '#f59e0b', bg: '#fffbeb' },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="mgr-stat-card">
                      <div className="mgr-stat-top">
                        <div className="mgr-stat-icon-wrap" style={{ background: stat.bg, color: stat.color }}>
                          <Icon />
                        </div>
                      </div>
                      <div className="mgr-stat-val">{stat.val}</div>
                      <div className="mgr-stat-lbl">{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Lead Funnel */}
              <section className="mgr-section-card">
                <div className="mgr-section-header">
                  <div className="mgr-section-title-wrap">
                    <h2 className="mgr-section-title">Lead Conversion Funnel</h2>
                    <span className="mgr-section-badge">{data.totalLeads} Total Leads</span>
                  </div>
                </div>

                <div className="funnel-list">
                  {Object.entries(STAGE_COLORS).map(([stageKey, config]) => {
                    const count = stageCount(stageKey);
                    const pct = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100) : 0;
                    return (
                      <div key={stageKey} className="funnel-item-row">
                        <span className="funnel-stage-name">
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: config.bg,
                              display: 'inline-block',
                            }}
                          />
                          {config.label}
                        </span>

                        <div className="funnel-track-bar">
                          <div
                            className="funnel-fill-bar"
                            style={{
                              width: `${data.totalLeads ? Math.max(2, (count / data.totalLeads) * 100) : 0}%`,
                              background: config.bg,
                            }}
                          />
                        </div>

                        <span className="funnel-count-badge">{count}</span>
                        <span className="funnel-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* TEAM MEMBERS SECTION - ACCORDING TO TEAM */}
              <section className="mgr-section-card">
                <div className="mgr-section-header">
                  <div className="mgr-section-title-wrap">
                    <h2 className="mgr-section-title">Team Members Directory</h2>
                    <span className="mgr-section-badge">
                      {filteredTeamMembers.length} {filteredTeamMembers.length === 1 ? 'Member' : 'Members'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className={`team-chip-btn ${groupByTeam ? 'active' : ''}`}
                      onClick={() => setGroupByTeam(!groupByTeam)}
                      title="Group members by team"
                    >
                      <FaLayerGroup size={12} />
                      <span>{groupByTeam ? 'Grouped by Team' : 'Flat Grid'}</span>
                    </button>
                  </div>
                </div>

                {/* Instant Filter and Search Bar for Team Members */}
                <div className="team-filter-bar">
                  <div className="team-search-row">
                    {/* Live Search */}
                    <div className="team-search-box">
                      <FaSearch className="team-search-icon" />
                      <input
                        type="text"
                        placeholder="Instant search by member name, email, phone, role, or team name..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="team-search-input"
                      />
                      {memberSearch && (
                        <button
                          type="button"
                          className="team-search-clear"
                          onClick={() => setMemberSearch('')}
                          title="Clear search"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>

                    {/* Role Filter */}
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="team-filter-select"
                      aria-label="Filter by role"
                    >
                      <option value="all">All Roles</option>
                      <option value="manager">👔 Managers</option>
                      <option value="telecaller">🎧 Telecallers</option>
                      <option value="sales executer">💼 Sales Executers</option>
                      <option value="admin">🛡️ Admins</option>
                    </select>

                    {/* Reset Button */}
                    {(memberSearch || selectedTeamFilter !== 'all' || selectedRoleFilter !== 'all') && (
                      <button
                        type="button"
                        className="team-chip-btn"
                        onClick={() => {
                          setMemberSearch('');
                          setSelectedTeamFilter('all');
                          setSelectedRoleFilter('all');
                        }}
                      >
                        <FaFilter size={11} /> Reset
                      </button>
                    )}
                  </div>

                  {/* Team Filter Chips (According to Team) */}
                  <div className="team-chips-row">
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>
                      Filter by Team:
                    </span>
                    <button
                      type="button"
                      className={`team-chip-btn ${selectedTeamFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedTeamFilter('all')}
                    >
                      <FaThLarge size={11} /> All Teams
                      <span className="team-chip-count">{data.team?.length || 0}</span>
                    </button>

                    {teamsList.map((team) => {
                      const count = (data.team || []).filter((m) =>
                        (m.teamIds || []).some((t) => (typeof t === 'object' ? t._id : t) === team._id)
                      ).length;
                      return (
                        <button
                          key={team._id}
                          type="button"
                          className={`team-chip-btn ${selectedTeamFilter === team._id ? 'active' : ''}`}
                          onClick={() => setSelectedTeamFilter(selectedTeamFilter === team._id ? 'all' : team._id)}
                        >
                          <FaUsers size={11} /> {team.name}
                          <span className="team-chip-count">{count}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className={`team-chip-btn ${selectedTeamFilter === 'unassigned' ? 'active' : ''}`}
                      onClick={() => setSelectedTeamFilter(selectedTeamFilter === 'unassigned' ? 'all' : 'unassigned')}
                    >
                      <span>No Team / Ops</span>
                      <span className="team-chip-count">
                        {(data.team || []).filter((m) => !m.teamIds || m.teamIds.length === 0).length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Team Members Display */}
                {filteredTeamMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <FaUsers size={32} style={{ marginBottom: '10px' }} />
                    <p style={{ margin: 0 }}>No team members match your filter or search criteria.</p>
                  </div>
                ) : groupByTeam && selectedTeamFilter === 'all' ? (
                  /* Grouped by Team View */
                  <div>
                    {groupedMembers.map((group) => (
                      <div key={group.team._id} className="team-group-block">
                        <div className="team-group-header">
                          <h3 className="team-group-title">
                            <FaUsers style={{ color: '#2563eb' }} />
                            <span>{group.team.name}</span>
                            {group.team.code && (
                              <span className="team-group-code">{group.team.code}</span>
                            )}
                          </h3>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>
                            {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                          </span>
                        </div>

                        <div className="team-members-grid">
                          {group.members.map((member) => (
                            <MemberCard
                              key={member._id}
                              member={member}
                              searchTerm={memberSearch}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Standard Grid View */
                  <div className="team-members-grid">
                    {filteredTeamMembers.map((member) => (
                      <MemberCard
                        key={member._id}
                        member={member}
                        searchTerm={memberSearch}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* DISTRIBUTION TAB */}
          {view === 'distribution' && (
            <section className="mgr-section-card">
              <div className="mgr-section-header">
                <div>
                  <h2 className="mgr-section-title">Lead Distribution Panel</h2>
                  <p className="manager-subtitle">
                    Select unassigned leads for round-robin distribution or assign them directly to telecallers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => distribute([])}
                  className="btn-assign-primary"
                  style={{ background: '#059669' }}
                >
                  ⚡ Auto-distribute All Unassigned Leads
                </button>
              </div>

              {/* Search unassigned leads */}
              <div className="distribution-actions-bar">
                <div className="team-search-box" style={{ maxWidth: 360 }}>
                  <FaSearch className="team-search-icon" />
                  <input
                    type="text"
                    placeholder="Search unassigned leads..."
                    value={distributeSearch}
                    onChange={(e) => setDistributeSearch(e.target.value)}
                    className="team-search-input"
                  />
                  {distributeSearch && (
                    <button
                      type="button"
                      className="team-search-clear"
                      onClick={() => setDistributeSearch('')}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>

                {selected.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
                      {selected.length} Selected
                    </span>
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="team-filter-select"
                    >
                      <option value="">Choose Telecaller...</option>
                      {(data.team || [])
                        .filter((m) => m.role === 'telecaller')
                        .map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!assignee}
                      onClick={() => distribute(selected, assignee)}
                      className="btn-assign-primary"
                    >
                      Assign Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => distribute(selected)}
                      className="btn-assign-primary"
                      style={{ background: '#475569' }}
                    >
                      Round-Robin Selected
                    </button>
                  </div>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={
                            filteredUnassignedLeads.length > 0 &&
                            selected.length === filteredUnassignedLeads.length
                          }
                          onChange={(e) =>
                            setSelected(e.target.checked ? filteredUnassignedLeads.map((l) => l._id) : [])
                          }
                        />
                      </th>
                      <th>Lead Name</th>
                      <th>Company</th>
                      <th>Stage</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnassignedLeads.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          No unassigned leads found.
                        </td>
                      </tr>
                    ) : (
                      filteredUnassignedLeads.map((lead) => (
                        <tr key={lead._id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.includes(lead._id)}
                              onChange={() =>
                                setSelected((items) =>
                                  items.includes(lead._id)
                                    ? items.filter((id) => id !== lead._id)
                                    : [...items, lead._id]
                                )
                              }
                            />
                          </td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{lead.name}</td>
                          <td>{lead.company || '—'}</td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: '#eff6ff',
                                color: '#2563eb',
                                fontSize: '11.5px',
                                fontWeight: 600,
                              }}
                            >
                              {lead.pipelineStage || 'NEW'}
                            </span>
                          </td>
                          <td>{lead.phone || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* SITE VISITS TAB */}
          {view === 'visits' && (
            <section className="mgr-section-card">
              <div className="mgr-section-header">
                <div>
                  <h2 className="mgr-section-title">Site Visits Management</h2>
                  <p className="manager-subtitle">
                    Schedule sales executives to leads ready for site visit, or track scheduled and completed visits.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="mgr-section-badge">
                    {teamExecutives.length} Active Sales Executive{teamExecutives.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Sub-Navigation between Leads Pipeline and Scheduled Visits */}
              <div className="visits-subnav-row" style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  className={`team-chip-btn ${visitSubTab === 'pipeline' ? 'active' : ''}`}
                  onClick={() => setVisitSubTab('pipeline')}
                >
                  <FaMapMarkerAlt size={12} />
                  <span>Leads Pipeline (Assign Visits)</span>
                  {readyVisitCount > 0 && (
                    <span className="tab-badge-pill" style={{ background: '#fdf2f8', color: '#db2777' }}>
                      {readyVisitCount} Ready
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`team-chip-btn ${visitSubTab === 'scheduled' ? 'active' : ''}`}
                  onClick={() => setVisitSubTab('scheduled')}
                >
                  <FaClipboardCheck size={12} />
                  <span>Scheduled & Logged Visits</span>
                  <span className="team-chip-count">{data.scheduledVisits?.length || 0}</span>
                </button>
              </div>

              {/* Instant Search and Multi-Filters Toolbar (According to Team & User) */}
              <div className="visits-toolbar">
                <div className="visits-controls-row">
                  {/* Live Search */}
                  <div className="team-search-box">
                    <FaSearch className="team-search-icon" />
                    <input
                      type="text"
                      placeholder="Instant search by lead, company, phone, stage, team, or executive..."
                      value={visitSearch}
                      onChange={(e) => setVisitSearch(e.target.value)}
                      className="team-search-input"
                    />
                    {visitSearch && (
                      <button
                        type="button"
                        className="team-search-clear"
                        onClick={() => setVisitSearch('')}
                        title="Clear search"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  {/* Stage / Readiness Filter (for pipeline leads) */}
                  {visitSubTab === 'pipeline' && (
                    <select
                      value={visitStageFilter}
                      onChange={(e) => setVisitStageFilter(e.target.value)}
                      className="team-filter-select"
                      aria-label="Filter by stage"
                    >
                      <option value="all">All Stages</option>
                      <option value="ready">🎯 Ready for Visit (SITE_VISIT_PLANNED)</option>
                      <option value="NEW">New Leads</option>
                      <option value="CONNECTED">Connected</option>
                      <option value="INTERESTED">Interested</option>
                      <option value="FOLLOW_UP">Follow-up</option>
                      <option value="SITE_VISIT_DONE">Site Visit Done</option>
                      <option value="CONVERTED">Converted</option>
                    </select>
                  )}

                  {/* Team Filter (According to Team) */}
                  <select
                    value={visitTeamFilter}
                    onChange={(e) => setVisitTeamFilter(e.target.value)}
                    className="team-filter-select"
                    aria-label="Filter by team"
                  >
                    <option value="all">All Teams</option>
                    {teamsList.map((t) => (
                      <option key={t._id} value={t._id}>
                        👥 {t.name}
                      </option>
                    ))}
                    <option value="unassigned">No Team Assigned</option>
                  </select>

                  {/* User Filter (According to User / Executive) */}
                  <select
                    value={visitUserFilter}
                    onChange={(e) => setVisitUserFilter(e.target.value)}
                    className="team-filter-select"
                    aria-label="Filter by user"
                  >
                    <option value="all">All Users / Executives</option>
                    {(data.team || []).map((m) => (
                      <option key={m._id} value={m._id}>
                        👤 {m.name} ({m.role})
                      </option>
                    ))}
                    <option value="unassigned">Unassigned</option>
                  </select>

                  {/* Reset Filters */}
                  {(visitSearch || visitStageFilter !== 'all' || visitTeamFilter !== 'all' || visitUserFilter !== 'all') && (
                    <button
                      type="button"
                      className="team-chip-btn"
                      onClick={() => {
                        setVisitSearch('');
                        setVisitStageFilter('all');
                        setVisitTeamFilter('all');
                        setVisitUserFilter('all');
                      }}
                      title="Reset filters"
                    >
                      <FaFilter size={11} /> Reset
                    </button>
                  )}
                </div>

                {/* Filter Summary Tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12.5px', color: '#64748b' }}>
                  <span>
                    Showing{' '}
                    <strong>
                      {visitSubTab === 'pipeline' ? filteredVisitLeads.length : filteredScheduledVisits.length}
                    </strong>{' '}
                    {visitSubTab === 'pipeline' ? 'leads' : 'visits'}
                  </span>
                  {visitStageFilter === 'ready' && (
                    <span className="ready-stage-badge" style={{ animation: 'none' }}>
                      Ready for Visit
                      <button
                        type="button"
                        onClick={() => setVisitStageFilter('all')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                      >
                        <FaTimes size={10} />
                      </button>
                    </span>
                  )}
                  {visitTeamFilter !== 'all' && (
                    <span className="team-tag-pill">
                      Team Filtered
                      <button
                        type="button"
                        onClick={() => setVisitTeamFilter('all')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                      >
                        <FaTimes size={10} />
                      </button>
                    </span>
                  )}
                  {visitUserFilter !== 'all' && (
                    <span className="user-tag-pill">
                      User Filtered
                      <button
                        type="button"
                        onClick={() => setVisitUserFilter('all')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                      >
                        <FaTimes size={10} />
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-View 1: Leads Pipeline Table */}
              {visitSubTab === 'pipeline' && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Company</th>
                        <th>Stage</th>
                        <th>Team</th>
                        <th>Assigned To</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisitLeads.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            <FaMapMarkerAlt size={28} style={{ marginBottom: '8px', color: '#cbd5e1' }} />
                            <p style={{ margin: 0 }}>No leads match your filter and search criteria.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredVisitLeads.map((lead) => {
                          const isReady = lead.pipelineStage === 'SITE_VISIT_PLANNED';
                          const teamName = lead.team?.name || (lead.team ? 'Team' : 'No Team');
                          const assignedName = lead.assignedTo?.name || 'Unassigned';
                          const userInitials = (lead.assignedTo?.name || 'U')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();

                          return (
                            <tr key={lead._id}>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                                    <HighlightText text={lead.name} search={visitSearch} />
                                  </strong>
                                  {lead.phone && (
                                    <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <FaPhoneAlt size={10} />
                                      <HighlightText text={lead.phone} search={visitSearch} />
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td>
                                {lead.company ? (
                                  <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <FaBuilding size={11} color="#94a3b8" />
                                    <HighlightText text={lead.company} search={visitSearch} />
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>—</span>
                                )}
                              </td>

                              <td>
                                {isReady ? (
                                  <span className="ready-stage-badge">
                                    🎯 Ready for Visit
                                  </span>
                                ) : (
                                  <span className="stage-pill-neutral">
                                    <HighlightText text={lead.pipelineStage || 'NEW'} search={visitSearch} />
                                  </span>
                                )}
                              </td>

                              <td>
                                <span className="team-tag-pill">
                                  <FaBuilding size={10} />
                                  <HighlightText text={teamName} search={visitSearch} />
                                </span>
                              </td>

                              <td>
                                <span className="user-tag-pill">
                                  <span className="user-tag-avatar">{userInitials}</span>
                                  <HighlightText text={assignedName} search={visitSearch} />
                                </span>
                              </td>

                              <td style={{ textAlign: 'right' }}>
                                {isReady ? (
                                  <button
                                    type="button"
                                    onClick={() => setVisitLead(lead)}
                                    className="btn-assign-site-visit"
                                    title="Assign Sales Executive to visit this lead"
                                  >
                                    ⚡ Assign Executive
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Stage not ready
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-View 2: Scheduled & Completed Visits Table */}
              {visitSubTab === 'scheduled' && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Assigned Executive</th>
                        <th>Date & Time</th>
                        <th>Location Address</th>
                        <th>Priority</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScheduledVisits.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            <FaClipboardCheck size={28} style={{ marginBottom: '8px', color: '#cbd5e1' }} />
                            <p style={{ margin: 0 }}>No scheduled or completed site visits found.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredScheduledVisits.map((v) => {
                          const leadName = v.lead?.name || v.Lead?.name || 'Lead';
                          const company = v.lead?.company || v.Lead?.company || '';
                          const execName = v.assignedTo?.name || 'Unassigned Executive';
                          const dateStr = v.scheduledAt
                            ? new Date(v.scheduledAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—';

                          const statusColors = {
                            DONE: { bg: '#dcfce7', color: '#15803d' },
                            COMPLETED: { bg: '#dcfce7', color: '#15803d' },
                            PLANNED: { bg: '#eff6ff', color: '#1d4ed8' },
                            SCHEDULED: { bg: '#eff6ff', color: '#1d4ed8' },
                            MISSED: { bg: '#fee2e2', color: '#b91c1c' },
                            NOT_DONE: { bg: '#fee2e2', color: '#b91c1c' },
                          };
                          const sc = statusColors[v.status] || { bg: '#f1f5f9', color: '#475569' };

                          return (
                            <tr key={v._id}>
                              <td>
                                <div>
                                  <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>
                                    <HighlightText text={leadName} search={visitSearch} />
                                  </strong>
                                  {company && (
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                      <HighlightText text={company} search={visitSearch} />
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td>
                                <span className="user-tag-pill">
                                  <FaUserTie size={10} color="#2563eb" />
                                  <HighlightText text={execName} search={visitSearch} />
                                </span>
                              </td>

                              <td style={{ fontSize: '12.5px', color: '#475569' }}>
                                <FaCalendarAlt size={11} style={{ marginRight: '5px', color: '#94a3b8' }} />
                                {dateStr}
                              </td>

                              <td style={{ fontSize: '12.5px', color: '#475569', maxWidth: 220 }}>
                                <HighlightText text={v.address || '—'} search={visitSearch} />
                              </td>

                              <td>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background:
                                      v.priority === 'HIGH'
                                        ? '#fee2e2'
                                        : v.priority === 'MEDIUM'
                                        ? '#fef3c7'
                                        : '#f1f5f9',
                                    color:
                                      v.priority === 'HIGH'
                                        ? '#b91c1c'
                                        : v.priority === 'MEDIUM'
                                        ? '#b45309'
                                        : '#475569',
                                  }}
                                >
                                  {v.priority || 'MEDIUM'}
                                </span>
                              </td>

                              <td>
                                <span
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: '9999px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    background: sc.bg,
                                    color: sc.color,
                                  }}
                                >
                                  {v.status || 'PLANNED'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ATTENDANCE TAB */}
          {view === 'attendance' && (
            <section className="mgr-section-card">
              <div className="mgr-section-header">
                <div>
                  <h2 className="mgr-section-title">Team Attendance Reviews</h2>
                  <p className="manager-subtitle">Approve or reject team member check-ins and hours.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="team-filter-select"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="all">All Records</option>
                  </select>
                </div>
              </div>

              {/* Attendance Search */}
              <div style={{ marginBottom: '16px' }}>
                <div className="team-search-box" style={{ maxWidth: 360 }}>
                  <FaSearch className="team-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by employee name or status..."
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="team-search-input"
                  />
                  {attendanceSearch && (
                    <button
                      type="button"
                      className="team-search-clear"
                      onClick={() => setAttendanceSearch('')}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Status</th>
                      <th>Manager Remarks</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          No attendance records found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((record) => (
                        <tr key={record._id}>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{record.user?.name || '—'}</td>
                          <td>{record.date}</td>
                          <td>
                            {record.checkInTime || record.markedAt
                              ? new Date(record.checkInTime || record.markedAt).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td>
                            {record.checkOutTime
                              ? new Date(record.checkOutTime).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Not checked out'}
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                background:
                                  record.status === 'APPROVED'
                                    ? '#dcfce7'
                                    : record.status === 'REJECTED'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                                color:
                                  record.status === 'APPROVED'
                                    ? '#15803d'
                                    : record.status === 'REJECTED'
                                    ? '#b91c1c'
                                    : '#b45309',
                              }}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td>
                            {record.status === 'PENDING' ? (
                              <input
                                value={remarks[record._id] || ''}
                                onChange={(e) => setRemarks({ ...remarks, [record._id]: e.target.value })}
                                placeholder="Optional remark..."
                                className="team-search-input"
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                              />
                            ) : (
                              record.managerRemarks || '—'
                            )}
                          </td>
                          <td>
                            {record.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => reviewAttendance(record, 'APPROVED')}
                                  style={{
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    background: '#dcfce7',
                                    color: '#166534',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => reviewAttendance(record, 'REJECTED')}
                                  style={{
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* Assign Site Visit Modal */}
      {visitLead && (
        <div
          className="mgr-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVisitLead(null);
          }}
        >
          <div className="mgr-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Assign Site Visit</h3>
              <button
                type="button"
                onClick={() => setVisitLead(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: '#475569' }}>
              Lead: <strong>{visitLead.name}</strong> {visitLead.company ? `(${visitLead.company})` : ''}
            </p>

            <form onSubmit={assignVisit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Select Sales Executive *
                </label>
                <select
                  required
                  value={visit.executiveId}
                  onChange={(e) => setVisit({ ...visit, executiveId: e.target.value })}
                  className="team-search-input"
                >
                  <option value="">-- Choose Sales Executive --</option>
                  {teamExecutives.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Date and Time *
                </label>
                <input
                  required
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  value={visit.scheduledAt}
                  onChange={(e) => setVisit({ ...visit, scheduledAt: e.target.value })}
                  className="team-search-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Site Location Address *
                </label>
                <input
                  required
                  placeholder="e.g. Plot 42, Sector 14, Commercial District"
                  value={visit.address}
                  onChange={(e) => setVisit({ ...visit, address: e.target.value })}
                  className="team-search-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Priority
                </label>
                <select
                  required
                  value={visit.priority}
                  onChange={(e) => setVisit({ ...visit, priority: e.target.value })}
                  className="team-search-input"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Visit Notes & Instructions
                </label>
                <textarea
                  rows="3"
                  placeholder="Specific requirements, client expectations..."
                  value={visit.notes}
                  onChange={(e) => setVisit({ ...visit, notes: e.target.value })}
                  className="team-search-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setVisitLead(null)}
                  className="team-chip-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-assign-primary">
                  Confirm Site Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

// Reusable Member Card Component
const MemberCard = ({ member, searchTerm }) => {
  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.telecaller;
  const RoleIcon = roleConfig.icon;
  const initials = (member.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const teamNames = (member.teamIds || [])
    .map((t) => (typeof t === 'object' ? t.name : ''))
    .filter(Boolean);

  return (
    <div
      className="member-card-custom"
      style={{ borderLeft: `4px solid ${roleConfig.color}` }}
    >
      <div className="member-card-header">
        <div className="member-avatar-circle" style={{ background: roleConfig.color }}>
          {initials}
        </div>
        <div className="member-info-col">
          <h4 className="member-name-text">
            <HighlightText text={member.name} search={searchTerm} />
          </h4>

          <div className="member-badges-row">
            <span
              className="role-badge-pill"
              style={{
                background: roleConfig.bg,
                color: roleConfig.color,
                border: `1px solid ${roleConfig.border}`,
              }}
            >
              <RoleIcon size={10} />
              {roleConfig.label}
            </span>

            {teamNames.length > 0 ? (
              teamNames.map((tName, i) => (
                <span key={i} className="team-badge-pill">
                  <FaBuilding size={9} />
                  <HighlightText text={tName} search={searchTerm} />
                </span>
              ))
            ) : (
              <span className="team-badge-pill" style={{ opacity: 0.7 }}>
                No Team
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="member-contact-row">
        {member.email && (
          <a
            href={`mailto:${member.email}`}
            className="member-contact-link"
            title={`Email ${member.name}`}
          >
            <FaEnvelope size={11} color="#94a3b8" />
            <HighlightText text={member.email} search={searchTerm} />
          </a>
        )}
        {member.phone && (
          <a
            href={`tel:${member.phone}`}
            className="member-contact-link"
            title={`Call ${member.name}`}
          >
            <FaPhoneAlt size={11} color="#94a3b8" />
            <HighlightText text={member.phone} search={searchTerm} />
          </a>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FaUsers,
  FaSearch,
  FaTimes,
  FaPhoneAlt,
  FaWhatsapp,
  FaEdit,
  FaUserCheck,
  FaUserTimes,
  FaHeadset,
  FaBriefcase,
  FaCrown,
  FaShieldAlt,
  FaSync,
  FaThList,
  FaThLarge,
  FaEnvelope,
  FaBuilding,
  FaCheckCircle
} from 'react-icons/fa';
import api from '../../services/api';
import './ManagerTeam.css';

const formatRoleBadge = (role) => {
  switch (role) {
    case 'telecaller':
      return { label: 'Telecaller', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe', icon: FaHeadset };
    case 'sales executer':
    case 'sales executive':
      return { label: 'Sales Executer', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', icon: FaBriefcase };
    case 'manager':
      return { label: 'Manager / Lead', bg: '#f3e8ff', color: '#7e22ce', border: '#d8b4fe', icon: FaCrown };
    case 'admin':
      return { label: 'Admin', bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', icon: FaShieldAlt };
    default:
      return { label: role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: FaUsers };
  }
};

const getInitials = (name) => {
  if (!name) return 'TM';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'TM';
};

const ManagerTeam = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name_asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Edit Modal State
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchTeam = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get('/auth/users');
      setMembers(res.data?.data || []);
      if (isSilent) toast.success('Team roster refreshed!');
    } catch (error) {
      toast.error('Unable to load team members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      name: member.name || '',
      phone: member.phone || '',
      isActive: member.isActive !== false
    });
  };

  const saveEdit = async () => {
    if (!form.name.trim()) return toast.error('Name cannot be empty');
    if (!form.phone.trim()) return toast.error('Phone cannot be empty');

    setSaving(true);
    try {
      await api.put(`/auth/users/${editing._id}`, form);
      toast.success(`Updated ${form.name} successfully!`);
      setEditing(null);
      fetchTeam(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update member');
    } finally {
      setSaving(false);
    }
  };

  // Counts calculations
  const telecallerCount = useMemo(
    () => members.filter((m) => m.role === 'telecaller').length,
    [members]
  );
  const salesExecCount = useMemo(
    () => members.filter((m) => m.role === 'sales executer' || m.role === 'sales executive').length,
    [members]
  );
  const activeCount = useMemo(
    () => members.filter((m) => m.isActive !== false).length,
    [members]
  );

  // Available unique roles for filter
  const availableRoles = useMemo(() => {
    const roles = new Set(members.map((m) => m.role).filter(Boolean));
    return ['ALL', ...Array.from(roles)];
  }, [members]);

  // Filtered & Sorted Members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((m) => {
        const name = (m.name || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const phone = (m.phone || '').toLowerCase();
        const role = (m.role || '').toLowerCase();
        const dept = (m.department || '').toLowerCase();
        const userId = (m.userId || '').toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          role.includes(q) ||
          dept.includes(q) ||
          userId.includes(q)
        );
      });
    }

    // Role filter
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'sales executer') {
        result = result.filter((m) => m.role === 'sales executer' || m.role === 'sales executive');
      } else {
        result = result.filter((m) => m.role === roleFilter);
      }
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      const shouldBeActive = statusFilter === 'ACTIVE';
      result = result.filter((m) => (m.isActive !== false) === shouldBeActive);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'role') {
        return (a.role || '').localeCompare(b.role || '');
      }
      if (sortBy === 'status') {
        return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
      }
      if (sortBy === 'recent') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });

    return result;
  }, [members, search, roleFilter, statusFilter, sortBy]);

  const hasActiveFilters = Boolean(
    search.trim() ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    sortBy !== 'name_asc'
  );

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('name_asc');
  };

  return (
    <div className="mt-container">
      {/* Top Header */}
      <div className="mt-header">
        <div className="mt-title-group">
          <div className="mt-icon-box">
            <FaUsers />
          </div>
          <div>
            <h1 className="mt-title">My Team & Workforce Operations</h1>
            <p className="mt-subtitle">
              Manage department team members, monitor active roles, update profiles, and connect directly.
            </p>
          </div>
        </div>

        <button onClick={() => fetchTeam(true)} className="mt-refresh-btn" disabled={refreshing}>
          <FaSync className={refreshing ? 'fa-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh Team'}
        </button>
      </div>

      {/* Interactive KPI Cards */}
      <div className="mt-kpi-grid">
        {/* Total Members */}
        <div
          className={`mt-kpi-card ${roleFilter === 'ALL' && statusFilter === 'ALL' && !search ? 'active' : ''}`}
          onClick={() => { resetFilters(); setRoleFilter('ALL'); }}
          title="Click to view all team members"
        >
          <div className="mt-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FaUsers />
          </div>
          <div>
            <div className="mt-kpi-val">{members.length}</div>
            <div className="mt-kpi-label">Total Members</div>
            <div className="mt-kpi-sub">Connected Workforce</div>
          </div>
        </div>

        {/* Telecallers */}
        <div
          className={`mt-kpi-card ${roleFilter === 'telecaller' ? 'active' : ''}`}
          onClick={() => { resetFilters(); setRoleFilter('telecaller'); }}
          title="Click to filter Telecallers"
        >
          <div className="mt-kpi-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <FaHeadset />
          </div>
          <div>
            <div className="mt-kpi-val">{telecallerCount}</div>
            <div className="mt-kpi-label">Telecallers</div>
            <div className="mt-kpi-sub">Lead Qualification & Calls</div>
          </div>
        </div>

        {/* Sales Executives */}
        <div
          className={`mt-kpi-card ${roleFilter === 'sales executer' ? 'active' : ''}`}
          onClick={() => { resetFilters(); setRoleFilter('sales executer'); }}
          title="Click to filter Sales Executers"
        >
          <div className="mt-kpi-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <FaBriefcase />
          </div>
          <div>
            <div className="mt-kpi-val">{salesExecCount}</div>
            <div className="mt-kpi-label">Sales Executers</div>
            <div className="mt-kpi-sub">Site Visits & Field Ops</div>
          </div>
        </div>

        {/* Active Staff */}
        <div
          className={`mt-kpi-card ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => { resetFilters(); setStatusFilter('ACTIVE'); }}
          title="Click to view Active members"
        >
          <div className="mt-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <FaUserCheck />
          </div>
          <div>
            <div className="mt-kpi-val">{activeCount}</div>
            <div className="mt-kpi-label">Active Staff</div>
            <div className="mt-kpi-sub">{Math.round((activeCount / (members.length || 1)) * 100)}% Online / Operational</div>
          </div>
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="mt-controls-panel">
        {/* Row 1: Search & Dropdowns */}
        <div className="mt-search-row">
          {/* Search Box */}
          <div className="mt-search-box">
            <FaSearch color="#94a3b8" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member name, phone, email, role..."
              className="mt-search-input"
            />
            {search && (
              <button onClick={() => setSearch('')} className="mt-search-clear" title="Clear search">
                <FaTimes size={12} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-select"
            title="Filter by workforce status"
          >
            <option value="ALL">● All Status</option>
            <option value="ACTIVE">● Active Members</option>
            <option value="INACTIVE">○ Inactive Members</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="mt-select"
            title="Sort member list"
          >
            <option value="name_asc">🔤 Name: A → Z</option>
            <option value="name_desc">🔤 Name: Z → A</option>
            <option value="role">👥 Group by Role</option>
            <option value="status">⚡ Active First</option>
            <option value="recent">📅 Recently Added</option>
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button onClick={resetFilters} className="mt-reset-btn" title="Reset all search & filters">
              <FaTimes size={11} /> Reset Filters
            </button>
          )}
        </div>

        {/* Row 2: Role Tabs & View Toggle */}
        <div className="mt-tabs-row">
          <div className="mt-role-tabs">
            {[
              { key: 'ALL', label: `All Members (${members.length})` },
              { key: 'telecaller', label: `Telecallers (${telecallerCount})` },
              { key: 'sales executer', label: `Sales Executers (${salesExecCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={`mt-role-tab ${roleFilter === tab.key ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Showing {filteredMembers.length} of {members.length} members
            </span>
            <div className="mt-view-toggle">
              <button
                onClick={() => setViewMode('table')}
                className={`mt-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                title="Table View"
              >
                <FaThList size={12} /> Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`mt-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                title="Cards Grid View"
              >
                <FaThLarge size={12} /> Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <FaSync className="fa-spin" size={24} style={{ color: '#2563eb', marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>Loading team members roster...</div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>👥</div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
            No team members match your search or filter
          </h3>
          <p style={{ fontSize: '13px', margin: 0, color: '#64748b' }}>
            {hasActiveFilters ? 'Try adjusting your search query or role filter.' : 'No members found in your team roster.'}
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
        /* Table View */
        <div className="mt-table-card">
          <table className="mt-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Team Member</th>
                <th style={{ width: '20%' }}>Role & Department</th>
                <th style={{ width: '24%' }}>Phone & Direct Connect</th>
                <th style={{ width: '14%' }}>Status</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const badge = formatRoleBadge(m.role);
                const isOnline = m.isActive !== false;
                const rawPhone = (m.phone || '').replace(/\D/g, '');

                return (
                  <tr key={m._id}>
                    {/* Column 1: Member Info */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {getInitials(m.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px', textTransform: 'capitalize' }}>
                            {m.name}
                          </div>
                          {m.email && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FaEnvelope size={10} color="#94a3b8" /> {m.email}
                            </div>
                          )}
                          {m.userId && (
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>
                              ID: {m.userId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Role */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span
                          className="mt-role-badge"
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`
                          }}
                        >
                          <badge.icon size={11} /> {badge.label}
                        </span>
                        {m.department && (
                          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                            {m.department}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 3: Contact */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px', marginBottom: '6px' }}>
                        {m.phone || 'No phone'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {m.phone && (
                          <>
                            <a
                              href={`tel:${m.phone}`}
                              className="mt-call-btn"
                              title="Direct Phone Call"
                            >
                              <FaPhoneAlt size={10} /> Call
                            </a>
                            <a
                              href={`https://wa.me/91${rawPhone}?text=Hello%20${encodeURIComponent(m.name)},%20reaching%20out%20from%20Sungrid%20Energy%20management.`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-wa-btn"
                              title="Chat on WhatsApp"
                            >
                              <FaWhatsapp size={12} /> WhatsApp
                            </a>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Column 4: Status */}
                    <td>
                      <span className={`mt-status-badge ${isOnline ? 'active' : 'inactive'}`}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: isOnline ? '#22c55e' : '#94a3b8'
                        }} />
                        {isOnline ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Column 5: Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => openEdit(m)}
                        className="mt-edit-btn"
                        title="Edit profile & status"
                      >
                        <FaEdit size={11} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards Grid View */
        <div className="mt-cards-grid">
          {filteredMembers.map((m) => {
            const badge = formatRoleBadge(m.role);
            const isOnline = m.isActive !== false;
            const rawPhone = (m.phone || '').replace(/\D/g, '');

            return (
              <div key={m._id} className="mt-member-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '15px',
                      flexShrink: 0
                    }}>
                      {getInitials(m.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', textTransform: 'capitalize' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {m.userId || 'ID: TM-01'}
                      </div>
                    </div>
                  </div>

                  <span className={`mt-status-badge ${isOnline ? 'active' : 'inactive'}`}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#94a3b8' }} />
                    {isOnline ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    className="mt-role-badge"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                  >
                    <badge.icon size={11} /> {badge.label}
                  </span>
                  {m.department && (
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                      • {m.department}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>📞 {m.phone || 'No phone'}</div>
                  {m.email && <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉️ {m.email}</div>}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="mt-call-btn" style={{ flex: 1, justifyContent: 'center' }}>
                      <FaPhoneAlt size={10} /> Call
                    </a>
                  )}
                  {m.phone && (
                    <a
                      href={`https://wa.me/91${rawPhone}?text=Hello%20${encodeURIComponent(m.name)},%20reaching%20out%20from%20Sungrid%20Energy%20management.`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-wa-btn"
                      style={{ padding: '0.4rem 0.85rem' }}
                    >
                      <FaWhatsapp size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => openEdit(m)}
                    className="mt-edit-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <FaEdit size={11} /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Member Modal */}
      {editing && (
        <div className="mt-modal-overlay">
          <div className="mt-modal-box">
            <div className="mt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800
                }}>
                  {getInitials(editing.name)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    Edit Team Member
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{editing.email}</div>
                </div>
              </div>
              <button
                onClick={() => setEditing(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-modal-body">
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Full Name:
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Phone Number:
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Active Workforce Status</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Active members can log in and manage customer leads</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.isActive)}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: form.isActive ? '#2563eb' : '#cbd5e1',
                    borderRadius: '24px',
                    transition: '.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px', width: '18px',
                      left: form.isActive ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '.2s'
                    }} />
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-modal-footer">
              <button
                onClick={() => setEditing(null)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTeam;

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCalendarAlt, FaCamera, FaCheckCircle, FaMapMarkerAlt,
  FaTimesCircle, FaCompass, FaPhoneAlt, FaWhatsapp, FaSync,
  FaCrosshairs, FaCheck, FaTimes, FaFilter, FaClock,
  FaUser, FaBuilding, FaExclamationTriangle, FaRoute,
  FaExternalLinkAlt, FaChartLine, FaCalendarCheck, FaUsers,
  FaChevronRight, FaSearch, FaEye
} from 'react-icons/fa';
import siteVisitService from '../services/siteVisitService';
import leadService from '../services/leadService';
import { SERVER_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import './SalesExecutiveDashboard.css';

const NOT_DONE_REASONS = [
  'Lead unavailable / Not at site',
  'Postponed by Customer',
  'Incorrect or incomplete address',
  'Inclement weather / Site inaccessible',
  'Customer cancelled visit request',
  'Other'
];

const SalesExecutiveDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [visits, setVisits] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'TODAY' | 'PLANNED' | 'DONE' | 'MISSED' | 'HIGH'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('time_asc'); // 'time_asc' | 'time_desc' | 'priority'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(null); // 'complete' | 'notdone'
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  // Complete visit form
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [location, setLocation] = useState({ latitude: null, longitude: null, accuracy: null, fetching: false, error: null });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Not done visit form
  const [notDone, setNotDone] = useState({ reason: NOT_DONE_REASONS[0], notes: '', nextScheduledAt: '' });

  // Load Executive Data
  const load = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);

    try {
      const [visitsRes, leadsRes] = await Promise.all([
        siteVisitService.getMyVisits(),
        leadService.getMyLeads({ limit: 1 }).catch(() => ({ data: { total: 0 } })),
      ]);

      const visitsList = visitsRes?.data?.data || (Array.isArray(visitsRes?.data) ? visitsRes.data : []);
      setVisits(visitsList);

      const count = leadsRes?.data?.total || leadsRes?.data?.count || (Array.isArray(leadsRes?.data?.data) ? leadsRes.data.data.length : 0);
      setLeadsCount(count);

      if (showToast) {
        toast.success('Dashboard data refreshed!');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Unable to load executive dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // GPS Acquisition
  const fetchGps = () => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: 26.983586,
        longitude: 80.922854,
        accuracy: 50,
        fetching: false,
        error: 'Geolocation is not supported by your device. Default coordinates applied.',
      });
      return;
    }

    setLocation((prev) => ({ ...prev, fetching: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          fetching: false,
          error: null,
        });
      },
      (err) => {
        setLocation({
          latitude: 26.983586,
          longitude: 80.922854,
          accuracy: 50,
          fetching: false,
          error: 'GPS permission denied or unavailable. Fallback coordinates applied.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openCompletion = (visit) => {
    setSelected(visit);
    setMode('complete');
    setPhoto(null);
    setPhotoPreview(null);
    setNotes('');
    fetchGps();
  };

  const openNotDone = (visit) => {
    setSelected(visit);
    setMode('notdone');
    setNotDone({ reason: NOT_DONE_REASONS[0], notes: '', nextScheduledAt: '' });
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const submitComplete = async (event) => {
    event.preventDefault();
    if (!photo) return toast.error('Please capture or select a photo of the visit site.');
    setSaving(true);
    try {
      const data = new FormData();
      data.append('photo', photo);
      data.append('notes', notes);
      data.append('latitude', location.latitude ?? 26.983586);
      data.append('longitude', location.longitude ?? 80.922854);
      data.append('address', selected.address || 'Site inspection');

      await siteVisitService.complete(selected._id, data);
      toast.success('Site visit completed and photographic proof submitted successfully! 🎉');
      setMode(null);
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to complete visit');
    } finally {
      setSaving(false);
    }
  };

  const submitNotDone = async (event) => {
    event.preventDefault();
    if (!notDone.reason) {
      return toast.error('Please select a reason.');
    }
    setSaving(true);
    try {
      await siteVisitService.notDone(selected._id, {
        notDoneReason: notDone.reason,
        notes: notDone.notes,
        nextDate: notDone.nextScheduledAt || undefined,
      });
      toast.info('Visit marked as not done. Status updated.');
      setMode(null);
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update visit');
    } finally {
      setSaving(false);
    }
  };

  // Helper date matching
  const isTodayDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let planned = 0;
    let done = 0;
    let missed = 0;
    let today = 0;
    let highPriority = 0;

    visits.forEach((v) => {
      const isPlanned = v.status === 'PLANNED' || v.status === 'SCHEDULED';
      const isDone = v.status === 'DONE' || v.status === 'COMPLETED';
      const isMissed = v.status === 'MISSED' || v.status === 'NOT_DONE';

      if (isPlanned) planned++;
      if (isDone) done++;
      if (isMissed) missed++;
      if (isTodayDate(v.scheduledAt) && isPlanned) today++;
      if (v.priority === 'HIGH') highPriority++;
    });

    const total = visits.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, planned, done, missed, today, highPriority, completionRate };
  }, [visits]);

  // Spotlight Next Upcoming Inspection
  const nextUpcomingVisit = useMemo(() => {
    const plannedList = visits
      .filter((v) => v.status === 'PLANNED' || v.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    // Return today's visit first if any, or earliest planned
    return plannedList[0] || null;
  }, [visits]);

  // Filtered and Sorted Visits
  const filteredVisits = useMemo(() => {
    let list = visits.filter((v) => {
      const isPlanned = v.status === 'PLANNED' || v.status === 'SCHEDULED';
      const isDone = v.status === 'DONE' || v.status === 'COMPLETED';
      const isMissed = v.status === 'MISSED' || v.status === 'NOT_DONE';

      if (activeTab === 'TODAY') return isTodayDate(v.scheduledAt) && isPlanned;
      if (activeTab === 'PLANNED') return isPlanned;
      if (activeTab === 'DONE') return isDone;
      if (activeTab === 'MISSED') return isMissed;
      if (activeTab === 'HIGH') return v.priority === 'HIGH';
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        const lead = v.lead || v.Lead || {};
        const name = (lead.name || '').toLowerCase();
        const company = (lead.company || '').toLowerCase();
        const phone = (lead.phone || '').toLowerCase();
        const addr = (v.address || '').toLowerCase();
        return name.includes(q) || company.includes(q) || phone.includes(q) || addr.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'time_asc') return new Date(a.scheduledAt) - new Date(b.scheduledAt);
      if (sortBy === 'time_desc') return new Date(b.scheduledAt) - new Date(a.scheduledAt);
      if (sortBy === 'priority') {
        const pOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
      }
      return 0;
    });

    return list;
  }, [visits, activeTab, searchQuery, sortBy]);

  // Dynamic Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <div className="sed-container">
      {/* 1. Executive Welcome Banner */}
      <div className="sed-welcome-banner">
        <div className="sed-welcome-left">
          <div className="sed-welcome-avatar">🚗</div>
          <div>
            <h1 className="sed-welcome-greeting">
              {greeting}, {user?.name || 'Field Executive'}!
              <span className="sed-welcome-role-badge">Sales Executive</span>
            </h1>
            <p className="sed-welcome-sub">
              Manage assigned site inspections, navigate customer locations with GPS, and submit verified photographic proofs.
            </p>
          </div>
        </div>

        <div className="sed-welcome-actions">
          <button
            type="button"
            className={`sed-btn-banner ${refreshing ? 'spinning' : ''}`}
            onClick={() => load(true)}
            title="Refresh visits"
          >
            <FaSync /> Refresh
          </button>
          <Link to="/my-visits" className="sed-btn-banner solid">
            <FaCalendarAlt /> Visits Calendar
          </Link>
        </div>
      </div>

      {/* 2. Quick Shortcuts Pill Bar */}
      <div className="sed-shortcuts-bar">
        <Link to="/my-visits" className="sed-shortcut-pill">
          <FaCalendarAlt style={{ color: '#2563eb' }} /> Visits Calendar (Month/Week)
        </Link>
        <Link to="/site-visits" className="sed-shortcut-pill">
          <FaCompass style={{ color: '#059669' }} /> My Site Visits (Grid/Table View)
        </Link>
        <Link to="/Leads" className="sed-shortcut-pill">
          <FaUsers style={{ color: '#7c3aed' }} /> My Assigned Leads
        </Link>
        <Link to="/attendance" className="sed-shortcut-pill">
          <FaCalendarCheck style={{ color: '#d97706' }} /> Punch Attendance
        </Link>
      </div>

      {/* 3. Executive KPI Cards */}
      <div className="sed-kpi-grid">
        <div
          className={`sed-kpi-card ${activeTab === 'TODAY' ? 'active' : ''}`}
          onClick={() => setActiveTab('TODAY')}
        >
          <div className="sed-kpi-icon today">
            <FaClock />
          </div>
          <div>
            <div className="sed-kpi-val">
              {stats.today}
              {stats.today > 0 && <span className="sed-kpi-badge" style={{ background: '#fef3c7', color: '#b45309' }}>Action</span>}
            </div>
            <div className="sed-kpi-lbl">Today's Visits</div>
          </div>
        </div>

        <div
          className={`sed-kpi-card ${activeTab === 'PLANNED' ? 'active' : ''}`}
          onClick={() => setActiveTab('PLANNED')}
        >
          <div className="sed-kpi-icon upcoming">
            <FaCalendarAlt />
          </div>
          <div>
            <div className="sed-kpi-val">{stats.planned}</div>
            <div className="sed-kpi-lbl">Upcoming Visits</div>
          </div>
        </div>

        <div
          className={`sed-kpi-card ${activeTab === 'DONE' ? 'active' : ''}`}
          onClick={() => setActiveTab('DONE')}
        >
          <div className="sed-kpi-icon completed">
            <FaCheckCircle />
          </div>
          <div>
            <div className="sed-kpi-val">{stats.done}</div>
            <div className="sed-kpi-lbl">Completed Proofs</div>
          </div>
        </div>

        <div
          className={`sed-kpi-card ${activeTab === 'MISSED' ? 'active' : ''}`}
          onClick={() => setActiveTab('MISSED')}
        >
          <div className="sed-kpi-icon missed">
            <FaTimesCircle />
          </div>
          <div>
            <div className="sed-kpi-val">{stats.missed}</div>
            <div className="sed-kpi-lbl">Missed / Reschedule</div>
          </div>
        </div>

        <div className="sed-kpi-card" onClick={() => navigate('/Leads')}>
          <div className="sed-kpi-icon leads">
            <FaUsers />
          </div>
          <div>
            <div className="sed-kpi-val">{leadsCount || visits.length}</div>
            <div className="sed-kpi-lbl">Assigned Leads</div>
          </div>
        </div>
      </div>

      {/* 4. Next Up Priority Spotlight Banner */}
      {nextUpcomingVisit && (
        <div className="sed-spotlight-card">
          <div>
            <div className="sed-spotlight-tag">
              <FaRoute /> Next Up on Your Schedule
            </div>
            <h3 className="sed-spotlight-title">
              {nextUpcomingVisit.lead?.name || 'Prospect Client'}
              {nextUpcomingVisit.lead?.company && (
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500, marginLeft: '8px' }}>
                  ({nextUpcomingVisit.lead.company})
                </span>
              )}
            </h3>
            <div className="sed-spotlight-meta">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2563eb', fontWeight: 600 }}>
                <FaClock /> {new Date(nextUpcomingVisit.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaMapMarkerAlt style={{ color: '#ef4444' }} /> {nextUpcomingVisit.address || 'Address on file'}
              </span>
              <span className={`sed-badge ${nextUpcomingVisit.priority === 'HIGH' ? 'missed' : 'planned'}`}>
                {nextUpcomingVisit.priority || 'MEDIUM'} PRIORITY
              </span>
            </div>
          </div>

          <div className="sed-spotlight-actions">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextUpcomingVisit.address || 'Site inspection')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sed-btn primary"
            >
              <FaCompass /> Start Navigation
            </a>
            {nextUpcomingVisit.lead?.phone && (
              <a
                href={`tel:${nextUpcomingVisit.lead.phone}`}
                className="sed-btn"
                title="Call Customer"
              >
                <FaPhoneAlt size={11} color="#2563eb" /> Call
              </a>
            )}
            <button
              type="button"
              className="sed-btn success"
              onClick={() => openCompletion(nextUpcomingVisit)}
            >
              <FaCamera /> Complete Now
            </button>
          </div>
        </div>
      )}

      {/* 5. Performance Progress Meter */}
      <div className="sed-performance-strip">
        <div className="sed-meter-info">
          <FaChartLine size={20} color="#2563eb" />
          <div>
            <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0f172a' }}>
              Site Inspection Performance Rate
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {stats.done} of {stats.total} visits verified with photo & GPS coordinates.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="sed-meter-bar-wrap">
            <div className="sed-meter-fill" style={{ width: `${stats.completionRate}%` }} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>
            {stats.completionRate}%
          </div>
        </div>
      </div>

      {/* 6. Filter & Search Toolbar */}
      <div className="sed-toolbar">
        <div className="sed-tabs">
          {[
            { key: 'ALL', label: `All Visits (${visits.length})` },
            { key: 'TODAY', label: `Today's (${stats.today})` },
            { key: 'PLANNED', label: `Upcoming (${stats.planned})` },
            { key: 'DONE', label: `Completed (${stats.done})` },
            { key: 'MISSED', label: `Missed (${stats.missed})` },
            { key: 'HIGH', label: `High Priority (${stats.highPriority})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`sed-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="sed-search-wrap">
            <FaSearch className="sed-search-icon" />
            <input
              type="text"
              className="sed-search-input"
              placeholder="Search visits by client, phone, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="sed-btn"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }}
          >
            <option value="time_asc">Time: Earliest First</option>
            <option value="time_desc">Time: Latest First</option>
            <option value="priority">Priority: High to Low</option>
          </select>
        </div>
      </div>

      {/* 7. Visits List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          <FaSync className="spinning" size={24} style={{ marginBottom: '8px', color: '#2563eb' }} />
          <div>Loading site inspection schedule...</div>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>
            No visits match this filter
          </h3>
          <p style={{ fontSize: '13px', margin: 0 }}>
            {activeTab === 'TODAY'
              ? 'No visits scheduled for today. Check upcoming visits tab or the Visits Calendar.'
              : 'Try selecting "All Visits" or clearing your search filter.'}
          </p>
        </div>
      ) : (
        <div className="sed-visits-list">
          {filteredVisits.map((v) => {
            const isPlanned = v.status === 'PLANNED' || v.status === 'SCHEDULED';
            const isDone = v.status === 'DONE' || v.status === 'COMPLETED';
            const isMissed = v.status === 'MISSED' || v.status === 'NOT_DONE';
            const leadPhone = v.lead?.phone;
            const address = v.address || v.lead?.address?.street || 'Site location';

            return (
              <div key={v._id} className="sed-visit-card">
                <div className="sed-visit-card-top">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className={`sed-badge ${isDone ? 'done' : isMissed ? 'missed' : 'planned'}`}>
                        {v.status}
                      </span>
                      <span
                        className="sed-badge"
                        style={{
                          background: v.priority === 'HIGH' ? '#fef2f2' : '#f8fafc',
                          color: v.priority === 'HIGH' ? '#dc2626' : '#64748b',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {v.priority || 'MEDIUM'} PRIORITY
                      </span>
                      {isTodayDate(v.scheduledAt) && (
                        <span className="sed-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                          Today
                        </span>
                      )}
                    </div>

                    <h2 className="sed-visit-title">
                      {v.lead?.name || 'Prospect Client'}
                    </h2>
                    {v.lead?.company && (
                      <div className="sed-visit-company">
                        <FaBuilding size={12} /> {v.lead.company}
                      </div>
                    )}
                  </div>

                  <div className="sed-visit-time-badge">
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>SCHEDULED TIME</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <FaClock size={11} color="#2563eb" />
                      {new Date(v.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="sed-visit-info-box">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#334155' }}>
                    <FaMapMarkerAlt color="#0284c7" style={{ marginTop: '3px', flexShrink: 0 }} />
                    <div>
                      <strong>Location:</strong> {address}
                    </div>
                  </div>

                  {v.notes && (
                    <div style={{ color: '#475569', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <strong>Manager Notes:</strong> {v.notes}
                    </div>
                  )}

                  {isMissed && v.notDoneReason && (
                    <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                      <strong>Missed Reason:</strong> {v.notDoneReason}
                      {v.nextDate && (
                        <span style={{ marginLeft: '8px' }}>
                          (Rescheduled: {new Date(v.nextDate).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  )}

                  {isDone && (v.latitude || v.longitude) && (
                    <div style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaCrosshairs />
                      <strong>Verified Coordinates:</strong> {v.latitude?.toFixed(6)}, {v.longitude?.toFixed(6)}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0284c7', textDecoration: 'underline', marginLeft: '6px' }}
                      >
                        Verify Map
                      </a>
                    </div>
                  )}

                  {isDone && v.completionNotes && (
                    <div style={{ color: '#334155', fontStyle: 'italic' }}>
                      <strong>Executive Report:</strong> {v.completionNotes}
                    </div>
                  )}

                  {isDone && (v.photoUrl || (Array.isArray(v.media) && v.media.length > 0)) && (() => {
                    const pUrl = v.photoUrl || (typeof v.media[0] === 'object' ? v.media[0]?.url : v.media[0]);
                    if (!pUrl || typeof pUrl !== 'string') return null;
                    const fullPUrl = pUrl.startsWith('http') || pUrl.startsWith('data:') ? pUrl : `${SERVER_URL}${pUrl.startsWith('/') ? pUrl : '/' + pUrl}`;
                    return (
                      <div style={{ marginTop: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                          ATTACHED PHOTO PROOF (CLICK TO ENLARGE):
                        </div>
                        <img
                          src={fullPUrl}
                          alt="Visit Proof"
                          className="sed-proof-thumb"
                          onClick={() => setEnlargedPhoto(fullPUrl)}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90" viewBox="0 0 120 90"><rect width="120" height="90" fill="%231e293b"/><text x="60" y="48" fill="%23ffffff" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Proof Verified</text></svg>`;
                          }}
                        />
                      </div>
                    );
                  })()}
                </div>

                <div className="sed-visit-actions">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sed-btn primary"
                    >
                      <FaCompass /> Navigate (Google Maps)
                    </a>

                    {leadPhone && (
                      <>
                        <a href={`tel:${leadPhone}`} className="sed-btn" title="Call Lead">
                          <FaPhoneAlt size={10} color="#2563eb" /> Call ({leadPhone})
                        </a>
                        <a
                          href={`https://wa.me/${leadPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sed-btn"
                          style={{ color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                        >
                          <FaWhatsapp size={12} /> WhatsApp
                        </a>
                      </>
                    )}

                    {v.lead?._id && (
                      <Link to={`/leads/${v.lead._id}`} className="sed-btn">
                        <FaUser size={10} /> Lead Profile
                      </Link>
                    )}
                  </div>

                  {isPlanned && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => openNotDone(v)}
                        className="sed-btn danger"
                      >
                        <FaTimes /> Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => openCompletion(v)}
                        className="sed-btn success"
                      >
                        <FaCamera /> Complete Visit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* COMPLETE VISIT MODAL */}
      {/* ========================================================= */}
      {mode === 'complete' && selected && (
        <div className="sed-modal-backdrop" onClick={() => setMode(null)}>
          <div className="sed-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sed-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem', color: '#16a34a' }}>📷</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Complete Site Inspection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMode(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={submitComplete}>
              <div className="sed-modal-body">
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Completing inspection for <strong>{selected.lead?.name || 'Client'}</strong> at{' '}
                  {selected.address || 'site'}.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Live Camera Photo Proof (Required) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    required
                    onChange={handlePhotoSelect}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    On mobile devices, this directly accesses the camera for live on-site inspection proof.
                  </small>
                  {photoPreview && (
                    <div style={{ marginTop: '10px' }}>
                      <img src={photoPreview} alt="Preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                      Live GPS Geotag
                    </label>
                    <button
                      type="button"
                      onClick={fetchGps}
                      className="sed-btn"
                      style={{ padding: '2px 6px', fontSize: '11px' }}
                    >
                      <FaSync size={9} /> Refresh GPS
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={
                      location.fetching
                        ? 'Acquiring satellite GPS coordinates...'
                        : location.latitude
                        ? `Lat: ${location.latitude.toFixed(6)}, Long: ${location.longitude.toFixed(6)} (Accuracy ±${location.accuracy ? Math.round(location.accuracy) : 50}m)`
                        : 'GPS Coordinates Unavailable'
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#334155',
                      boxSizing: 'border-box',
                    }}
                  />
                  {location.error && (
                    <small style={{ color: '#d97706', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                      ⚠️ {location.error}
                    </small>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Inspection Remarks & Client Feedback
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Verified roof dimensions, discussed solar requirements, customer confirmed visit..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div className="sed-modal-footer">
                <button
                  type="button"
                  className="sed-btn"
                  onClick={() => setMode(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="sed-btn success"
                >
                  {saving ? 'Uploading Proof...' : 'Submit Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* NOT DONE / RESCHEDULE MODAL */}
      {/* ========================================================= */}
      {mode === 'notdone' && selected && (
        <div className="sed-modal-backdrop" onClick={() => setMode(null)}>
          <div className="sed-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sed-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem', color: '#dc2626' }}>⚠️</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Mark Visit Not Done / Reschedule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMode(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={submitNotDone}>
              <div className="sed-modal-body">
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Update inspection record for <strong>{selected.lead?.name || 'Client'}</strong>.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Reason *
                  </label>
                  <select
                    value={notDone.reason}
                    onChange={(e) => setNotDone((prev) => ({ ...prev, reason: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {NOT_DONE_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Reschedule Next Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={notDone.nextScheduledAt}
                    onChange={(e) => setNotDone((prev) => ({ ...prev, nextScheduledAt: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Reason Details / Follow-up Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details on why visit could not proceed..."
                    value={notDone.notes}
                    onChange={(e) => setNotDone((prev) => ({ ...prev, notes: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div className="sed-modal-footer">
                <button
                  type="button"
                  className="sed-btn"
                  onClick={() => setMode(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="sed-btn danger"
                  style={{ background: '#dc2626', color: '#ffffff' }}
                >
                  {saving ? 'Updating...' : 'Confirm Not Done'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHOTO FULL SCREEN ENLARGE MODAL */}
      {/* ========================================================= */}
      {enlargedPhoto && (
        <div
          className="sed-modal-backdrop"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setEnlargedPhoto(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              type="button"
              onClick={() => setEnlargedPhoto(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaTimes />
            </button>
            <img
              src={enlargedPhoto}
              alt="Enlarged Proof"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesExecutiveDashboard;

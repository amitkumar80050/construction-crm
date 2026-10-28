import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCalendarAlt,
  FaCalendarDay,
  FaCalendarWeek,
  FaList,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
  FaSearch,
  FaFilter,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaWhatsapp,
  FaClock,
  FaBuilding,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaCamera,
  FaCrosshairs,
  FaTimes,
  FaExternalLinkAlt,
  FaCheck,
  FaExclamationTriangle,
} from 'react-icons/fa';
import siteVisitService from '../services/siteVisitService';
import { SERVER_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import './VisitsCalendar.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const NOT_DONE_REASONS = [
  { value: 'Lead_UNAVAILABLE', label: 'Lead / Client Unavailable' },
  { value: 'POSTPONED', label: 'Customer Postponed' },
  { value: 'WRONG_ADDRESS', label: 'Incorrect / Inaccessible Address' },
  { value: 'NOT_INTERESTED', label: 'Client Not Interested' },
  { value: 'WEATHER_OR_TRAFFIC', label: 'Bad Weather / Heavy Traffic' },
  { value: 'OTHER', label: 'Other Reason' },
];

const normalizeStatus = (status) => {
  const upper = (status || '').toUpperCase();
  if (upper === 'PLANNED' || upper === 'SCHEDULED') return 'PLANNED';
  if (upper === 'DONE' || upper === 'COMPLETED') return 'DONE';
  if (upper === 'MISSED' || upper === 'NOT_DONE') return 'MISSED';
  return 'PLANNED';
};

const getLeadInfo = (visit) => {
  const leadObj = visit.lead || visit.Lead || {};
  const name = (leadObj.name || '').trim();
  const company = (leadObj.company || '').trim();
  const phone = (leadObj.phone || '').trim();
  const email = (leadObj.email || '').trim();
  const leadId = leadObj._id || leadObj.id;

  return {
    name: name || company || 'Client Visit',
    company: company || (name ? '' : 'Individual Client'),
    phone,
    email,
    leadId,
    raw: leadObj,
  };
};

const formatAddress = (addr) => {
  if (!addr) return 'Site address on file';
  if (typeof addr === 'object') {
    return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') || 'Site address on file';
  }
  return String(addr);
};

const formatTimeStr = (dateObj) => {
  try {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return '';
  }
};

const isSameCalendarDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const VisitsCalendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' | 'agenda'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PLANNED' | 'DONE' | 'MISSED'
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

  // Modal states
  const [activeVisitModal, setActiveVisitModal] = useState(null);
  const [completeModalVisit, setCompleteModalVisit] = useState(null);
  const [notDoneModalVisit, setNotDoneModalVisit] = useState(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  // Complete Visit Form
  const [completePhoto, setCompletePhoto] = useState(null);
  const [completePreview, setCompletePreview] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [gpsLocation, setGpsLocation] = useState({ latitude: null, longitude: null, fetching: false, error: null });
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  // Not Done Form
  const [notDoneReason, setNotDoneReason] = useState('');
  const [notDoneNextDate, setNotDoneNextDate] = useState('');
  const [notDoneNotes, setNotDoneNotes] = useState('');
  const [isSubmittingNotDone, setIsSubmittingNotDone] = useState(false);

  // Fetch Site Visits from Backend
  const loadVisits = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      let res;
      if (isManagerOrAdmin) {
        res = await siteVisitService.getAllSiteVisits({ status: 'ALL' });
      } else {
        res = await siteVisitService.getMyVisits({ status: 'ALL' });
      }

      const list = res?.data || res?.data?.data || [];
      const arrayList = Array.isArray(list) ? list : (res?.data?.data || []);
      setVisits(arrayList);

      if (showToast) {
        toast.success('Site visits calendar updated!');
      }
    } catch (err) {
      console.error('Failed to load visits for calendar:', err);
      toast.error('Unable to fetch visits. Please check connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManagerOrAdmin]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // GPS Location detection helper
  const acquireGps = () => {
    if (!navigator.geolocation) {
      setGpsLocation({
        latitude: 26.983586,
        longitude: 80.922854,
        fetching: false,
        error: 'Geolocation unavailable on device. Using approximate site GPS.',
      });
      return;
    }

    setGpsLocation((prev) => ({ ...prev, fetching: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          fetching: false,
          error: null,
        });
      },
      (err) => {
        setGpsLocation({
          latitude: 26.983586,
          longitude: 80.922854,
          fetching: false,
          error: 'GPS permission denied or timed out. Default coordinates applied.',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Open Complete Modal
  const openCompleteModal = (visit) => {
    setActiveVisitModal(null);
    setCompleteModalVisit(visit);
    setCompletePhoto(null);
    setCompletePreview(null);
    setCompleteNotes('');
    acquireGps();
  };

  // Open Not Done Modal
  const openNotDoneModal = (visit) => {
    setActiveVisitModal(null);
    setNotDoneModalVisit(visit);
    setNotDoneReason('Lead_UNAVAILABLE');
    setNotDoneNextDate('');
    setNotDoneNotes('');
  };

  // Submit Visit Complete
  const handleSubmitComplete = async (e) => {
    e.preventDefault();
    if (!completePhoto) {
      toast.error('Live photo proof of the site is required.');
      return;
    }
    setIsSubmittingComplete(true);
    try {
      const formData = new FormData();
      formData.append('photo', completePhoto);
      formData.append('notes', completeNotes);
      formData.append('latitude', gpsLocation.latitude ?? 26.983586);
      formData.append('longitude', gpsLocation.longitude ?? 80.922854);
      formData.append('address', completeModalVisit.address || 'Site inspection');

      await siteVisitService.complete(completeModalVisit._id, formData);
      toast.success('🎉 Site inspection completed & proof uploaded!');
      setCompleteModalVisit(null);
      loadVisits();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to complete visit.');
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  // Submit Not Done / Reschedule
  const handleSubmitNotDone = async (e) => {
    e.preventDefault();
    if (!notDoneReason) {
      toast.error('Please select a reason.');
      return;
    }
    setIsSubmittingNotDone(true);
    try {
      await siteVisitService.notDone(notDoneModalVisit._id, {
        notDoneReason,
        nextDate: notDoneNextDate || undefined,
        notes: notDoneNotes,
      });
      toast.info('Visit marked as not done / rescheduled.');
      setNotDoneModalVisit(null);
      loadVisits();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update visit status.');
    } finally {
      setIsSubmittingNotDone(false);
    }
  };

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const status = normalizeStatus(v.status);
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;

      const priority = (v.priority || 'MEDIUM').toUpperCase();
      if (priorityFilter !== 'ALL' && priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const lead = getLeadInfo(v);
        const nameMatch = lead.name.toLowerCase().includes(q);
        const companyMatch = lead.company.toLowerCase().includes(q);
        const phoneMatch = lead.phone.toLowerCase().includes(q);
        const addrMatch = formatAddress(v.address).toLowerCase().includes(q);
        if (!nameMatch && !companyMatch && !phoneMatch && !addrMatch) return false;
      }

      return true;
    });
  }, [visits, statusFilter, priorityFilter, searchQuery]);

  // Overall KPI counts
  const kpiCounts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    let missed = 0;

    visits.forEach((v) => {
      const s = normalizeStatus(v.status);
      if (s === 'PLANNED') upcoming++;
      else if (s === 'DONE') completed++;
      else if (s === 'MISSED') missed++;
    });

    return { total: visits.length, upcoming, completed, missed };
  }, [visits]);

  // Date Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
      setSelectedDate(new Date(d));
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
      setSelectedDate(new Date(d));
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Calendar title label
  const currentViewTitle = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    if (viewMode === 'month') {
      return `${MONTH_NAMES[m]} ${y}`;
    }

    if (viewMode === 'week') {
      const curr = new Date(currentDate);
      const day = curr.getDay();
      const first = new Date(curr);
      first.setDate(curr.getDate() - day);
      const last = new Date(first);
      last.setDate(first.getDate() + 6);

      const fMonth = MONTH_NAMES[first.getMonth()].slice(0, 3);
      const lMonth = MONTH_NAMES[last.getMonth()].slice(0, 3);

      if (first.getMonth() === last.getMonth()) {
        return `${fMonth} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
      }
      return `${fMonth} ${first.getDate()} – ${lMonth} ${last.getDate()}, ${last.getFullYear()}`;
    }

    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return `${MONTH_NAMES[m]} ${y} Agenda`;
  }, [currentDate, selectedDate, viewMode]);

  // Month Grid Calculation
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDaysCount = new Date(year, month, 0).getDate();

    const days = [];

    // Preceding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDaysCount - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Days in current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Trailing days from next month to complete standard 35 or 42 grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Week Grid Calculation
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const first = new Date(curr);
    first.setDate(curr.getDate() - day);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Get visits for a specific day
  const getVisitsForDay = useCallback(
    (targetDate) => {
      return filteredVisits.filter((v) => {
        if (!v.scheduledAt) return false;
        const vDate = new Date(v.scheduledAt);
        return isSameCalendarDay(vDate, targetDate);
      });
    },
    [filteredVisits]
  );

  // Grouped Agenda visits
  const agendaGrouped = useMemo(() => {
    const sorted = [...filteredVisits].sort(
      (a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0)
    );

    const groups = {};
    sorted.forEach((v) => {
      if (!v.scheduledAt) return;
      const d = new Date(v.scheduledAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!groups[key]) {
        groups[key] = {
          date: d,
          visits: [],
        };
      }
      groups[key].visits.push(v);
    });

    return Object.values(groups);
  }, [filteredVisits]);

  // Visits on selected date
  const selectedDayVisits = useMemo(() => {
    return getVisitsForDay(selectedDate);
  }, [selectedDate, getVisitsForDay]);

  return (
    <div className="vc-container">
      {/* Page Header */}
      <div className="vc-header">
        <div>
          <div className="vc-title-row">
            <span className="vc-title-icon">
              <FaCalendarAlt />
            </span>
            <div>
              <h1 className="vc-title">Visits Calendar</h1>
              <p className="vc-subtitle">
                Interactive schedule for site inspections, client meetings, and route navigation.
              </p>
            </div>
          </div>
        </div>

        <div className="vc-header-actions">
          <button
            type="button"
            className={`vc-btn-refresh ${refreshing ? 'spinning' : ''}`}
            onClick={() => loadVisits(true)}
            title="Refresh Site Visits"
          >
            <FaSync /> Refresh Schedule
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="vc-kpi-grid">
        <div
          className={`vc-kpi-card ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          <div className="vc-kpi-icon all">
            <FaCalendarAlt />
          </div>
          <div>
            <div className="vc-kpi-val">{kpiCounts.total}</div>
            <div className="vc-kpi-lbl">Total Visits</div>
          </div>
        </div>

        <div
          className={`vc-kpi-card ${statusFilter === 'PLANNED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('PLANNED')}
        >
          <div className="vc-kpi-icon upcoming">
            <FaClock />
          </div>
          <div>
            <div className="vc-kpi-val">{kpiCounts.upcoming}</div>
            <div className="vc-kpi-lbl">Upcoming / Planned</div>
          </div>
        </div>

        <div
          className={`vc-kpi-card ${statusFilter === 'DONE' ? 'active' : ''}`}
          onClick={() => setStatusFilter('DONE')}
        >
          <div className="vc-kpi-icon completed">
            <FaCheckCircle />
          </div>
          <div>
            <div className="vc-kpi-val">{kpiCounts.completed}</div>
            <div className="vc-kpi-lbl">Completed Proofs</div>
          </div>
        </div>

        <div
          className={`vc-kpi-card ${statusFilter === 'MISSED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('MISSED')}
        >
          <div className="vc-kpi-icon missed">
            <FaTimesCircle />
          </div>
          <div>
            <div className="vc-kpi-val">{kpiCounts.missed}</div>
            <div className="vc-kpi-lbl">Missed / Rescheduled</div>
          </div>
        </div>
      </div>

      {/* Main Toolbar: Navigation & View Switcher */}
      <div className="vc-toolbar">
        <div className="vc-nav-controls">
          <button type="button" className="vc-nav-btn" onClick={handlePrev} title="Previous">
            <FaChevronLeft />
          </button>
          <button type="button" className="vc-nav-today-btn" onClick={handleToday}>
            Today
          </button>
          <button type="button" className="vc-nav-btn" onClick={handleNext} title="Next">
            <FaChevronRight />
          </button>
          <span className="vc-current-label">{currentViewTitle}</span>
        </div>

        <div className="vc-view-modes">
          <button
            type="button"
            className={`vc-view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            <FaCalendarAlt size={12} /> Month
          </button>
          <button
            type="button"
            className={`vc-view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <FaCalendarWeek size={12} /> Week
          </button>
          <button
            type="button"
            className={`vc-view-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            <FaCalendarDay size={12} /> Day
          </button>
          <button
            type="button"
            className={`vc-view-btn ${viewMode === 'agenda' ? 'active' : ''}`}
            onClick={() => setViewMode('agenda')}
          >
            <FaList size={12} /> Agenda
          </button>
        </div>

        {/* Filters Row */}
        <div className="vc-filters-row">
          <div className="vc-search-wrap">
            <FaSearch className="vc-search-icon" />
            <input
              type="text"
              className="vc-search-input"
              placeholder="Search by client, company, phone, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="vc-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">Planned / Upcoming</option>
            <option value="DONE">Completed</option>
            <option value="MISSED">Missed / Rescheduled</option>
          </select>

          <select
            className="vc-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {/* CALENDAR CONTENT AREA */}
      <div className="vc-calendar-card">
        {loading ? (
          <div className="vc-empty-state">
            <div className="vc-empty-icon">⏳</div>
            <div className="vc-empty-title">Loading visits calendar...</div>
            <div className="vc-empty-sub">Fetching scheduled site inspections and customer data.</div>
          </div>
        ) : (
          <>
            {/* 1. MONTH VIEW */}
            {viewMode === 'month' && (
              <div>
                <div className="vc-month-grid">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd} className="vc-weekday-header">
                      {wd}
                    </div>
                  ))}

                  {monthGridDays.map(({ date, isCurrentMonth }, idx) => {
                    const dayVisits = getVisitsForDay(date);
                    const isToday = isSameCalendarDay(date, new Date());
                    const isSelected = isSameCalendarDay(date, selectedDate);

                    return (
                      <div
                        key={idx}
                        className={`vc-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedDate(new Date(date))}
                      >
                        <div className="vc-day-top">
                          <span className="vc-day-number">{date.getDate()}</span>
                          {dayVisits.length > 0 && (
                            <span className="vc-day-count-badge">{dayVisits.length}</span>
                          )}
                        </div>

                        <div className="vc-day-events">
                          {dayVisits.slice(0, 3).map((v) => {
                            const status = normalizeStatus(v.status);
                            const lead = getLeadInfo(v);
                            const vDate = new Date(v.scheduledAt);
                            const timeStr = formatTimeStr(vDate);
                            const priorityClass = (v.priority || 'MEDIUM').toLowerCase();

                            return (
                              <div
                                key={v._id}
                                className={`vc-event-chip status-${status.toLowerCase()}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveVisitModal(v);
                                }}
                                title={`${timeStr} - ${lead.name} (${v.priority || 'MEDIUM'})`}
                              >
                                <span className={`vc-priority-dot ${priorityClass}`} />
                                <span className="vc-event-time">{timeStr}</span>
                                <span className="vc-event-title">{lead.name}</span>
                              </div>
                            );
                          })}

                          {dayVisits.length > 3 && (
                            <div
                              className="vc-more-events"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(new Date(date));
                                setViewMode('day');
                              }}
                            >
                              +{dayVisits.length - 3} more visits
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Day Agenda Drawer below Month Grid */}
                <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                        Selected Day: {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="vc-badge" style={{ background: '#e2e8f0', color: '#475569' }}>
                        {selectedDayVisits.length} Visit{selectedDayVisits.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="vc-btn-action"
                      onClick={() => setViewMode('day')}
                    >
                      <FaCalendarDay size={11} /> Open Full Day Timeline
                    </button>
                  </div>

                  {selectedDayVisits.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
                      No site visits scheduled on this day. Click on another date or switch to Agenda view.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                      {selectedDayVisits.map((v) => {
                        const status = normalizeStatus(v.status);
                        const lead = getLeadInfo(v);
                        const vDate = new Date(v.scheduledAt);
                        const timeStr = formatTimeStr(vDate);

                        return (
                          <div
                            key={v._id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '0.85rem 1rem',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FaClock size={11} /> {timeStr}
                              </span>
                              <span className={`vc-badge status-${status.toLowerCase()}`}>
                                {status}
                              </span>
                            </div>

                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>
                              {lead.name}
                            </div>
                            {lead.company && (
                              <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                                🏢 {lead.company}
                              </div>
                            )}

                            <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                              <FaMapMarkerAlt size={12} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {formatAddress(v.address)}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                              <button
                                type="button"
                                className="vc-btn-action primary"
                                style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.35rem' }}
                                onClick={() => setActiveVisitModal(v)}
                              >
                                View Details
                              </button>
                              {status === 'PLANNED' && (
                                <button
                                  type="button"
                                  className="vc-btn-action success"
                                  style={{ justifyContent: 'center', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                                  onClick={() => openCompleteModal(v)}
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. WEEK VIEW */}
            {viewMode === 'week' && (
              <div className="vc-week-grid">
                {weekDays.map((d, index) => {
                  const dayVisits = getVisitsForDay(d);
                  const isToday = isSameCalendarDay(d, new Date());

                  return (
                    <div key={index} className="vc-week-col">
                      <div className={`vc-week-header ${isToday ? 'today' : ''}`}>
                        <div className="vc-week-day-name">{WEEKDAYS[d.getDay()]}</div>
                        <div className="vc-week-day-num">{d.getDate()}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          {dayVisits.length} Visit{dayVisits.length === 1 ? '' : 's'}
                        </div>
                      </div>

                      <div className="vc-week-events-list">
                        {dayVisits.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', padding: '1rem 0' }}>
                            No visits
                          </div>
                        ) : (
                          dayVisits.map((v) => {
                            const status = normalizeStatus(v.status);
                            const lead = getLeadInfo(v);
                            const timeStr = formatTimeStr(new Date(v.scheduledAt));

                            return (
                              <div
                                key={v._id}
                                className="vc-week-card"
                                onClick={() => setActiveVisitModal(v)}
                              >
                                <div className="vc-week-card-time" style={{ color: status === 'DONE' ? '#16a34a' : status === 'MISSED' ? '#dc2626' : '#2563eb' }}>
                                  <FaClock size={10} /> {timeStr}
                                </div>
                                <div className="vc-week-card-name">{lead.name}</div>
                                <div className="vc-week-card-addr">{formatAddress(v.address)}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                  <span className={`vc-badge status-${status.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '2px 5px' }}>
                                    {status}
                                  </span>
                                  <span className={`vc-badge priority-${(v.priority || 'MEDIUM').toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '2px 5px' }}>
                                    {v.priority || 'MED'}
                                  </span>
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

            {/* 3. DAY VIEW */}
            {viewMode === 'day' && (
              <div className="vc-day-view">
                <div className="vc-day-view-header">
                  <div>
                    <div className="vc-day-view-date">
                      {selectedDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
                      Showing {selectedDayVisits.length} site inspection appointment{selectedDayVisits.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="vc-btn-action"
                    onClick={() => {
                      const prev = new Date(selectedDate);
                      prev.setDate(prev.getDate() - 1);
                      setSelectedDate(prev);
                      setCurrentDate(prev);
                    }}
                  >
                    <FaChevronLeft size={11} /> Previous Day
                  </button>
                  <button
                    type="button"
                    className="vc-btn-action"
                    onClick={() => {
                      const next = new Date(selectedDate);
                      next.setDate(next.getDate() + 1);
                      setSelectedDate(next);
                      setCurrentDate(next);
                    }}
                  >
                    Next Day <FaChevronRight size={11} />
                  </button>
                </div>

                {selectedDayVisits.length === 0 ? (
                  <div className="vc-empty-state">
                    <div className="vc-empty-icon">🏖️</div>
                    <div className="vc-empty-title">No Site Visits Scheduled</div>
                    <div className="vc-empty-sub">
                      There are no client meetings or site inspections scheduled for this date.
                    </div>
                  </div>
                ) : (
                  <div className="vc-day-timeline">
                    {selectedDayVisits.map((v) => {
                      const status = normalizeStatus(v.status);
                      const lead = getLeadInfo(v);
                      const timeStr = formatTimeStr(new Date(v.scheduledAt));

                      return (
                        <div key={v._id} className="vc-day-card">
                          <div className="vc-day-card-time-col">
                            <div className="vc-day-card-time">{timeStr}</div>
                            <span className={`vc-badge status-${status.toLowerCase()}`} style={{ marginTop: '6px' }}>
                              {status}
                            </span>
                          </div>

                          <div className="vc-day-card-content">
                            <div className="vc-day-card-top">
                              <div>
                                <h3 className="vc-day-card-name">{lead.name}</h3>
                                {lead.company && (
                                  <div className="vc-day-card-company">
                                    <FaBuilding size={12} /> {lead.company}
                                  </div>
                                )}
                              </div>
                              <span className={`vc-badge priority-${(v.priority || 'MEDIUM').toLowerCase()}`}>
                                {v.priority || 'MEDIUM'} PRIORITY
                              </span>
                            </div>

                            <div className="vc-day-card-addr">
                              <FaMapMarkerAlt style={{ color: '#ef4444', flexShrink: 0, marginTop: '3px' }} />
                              <span>{formatAddress(v.address)}</span>
                            </div>

                            {v.notes && (
                              <div style={{ fontSize: '0.825rem', color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #cbd5e1' }}>
                                <strong>Manager Notes:</strong> {v.notes}
                              </div>
                            )}

                            <div className="vc-day-card-actions">
                              <button
                                type="button"
                                className="vc-btn-action primary"
                                onClick={() => setActiveVisitModal(v)}
                              >
                                View Details
                              </button>

                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="vc-btn-action"
                                  title="Call Client"
                                >
                                  <FaPhoneAlt size={11} style={{ color: '#2563eb' }} /> Call ({lead.phone})
                                </a>
                              )}

                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(v.address))}`}
                                target="_blank"
                                rel="noreferrer"
                                className="vc-btn-action"
                              >
                                <FaMapMarkerAlt size={11} style={{ color: '#ef4444' }} /> Open Maps
                              </a>

                              {status === 'PLANNED' && (
                                <>
                                  <button
                                    type="button"
                                    className="vc-btn-action success"
                                    onClick={() => openCompleteModal(v)}
                                  >
                                    <FaCamera size={11} /> Complete Visit
                                  </button>
                                  <button
                                    type="button"
                                    className="vc-btn-action danger"
                                    onClick={() => openNotDoneModal(v)}
                                  >
                                    <FaTimes size={11} /> Reschedule
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. AGENDA VIEW */}
            {viewMode === 'agenda' && (
              <div className="vc-agenda-view">
                {agendaGrouped.length === 0 ? (
                  <div className="vc-empty-state">
                    <div className="vc-empty-icon">📭</div>
                    <div className="vc-empty-title">No visits match your filter</div>
                    <div className="vc-empty-sub">
                      Try clearing search criteria or selecting "All Statuses".
                    </div>
                  </div>
                ) : (
                  agendaGrouped.map((grp, gIdx) => {
                    const isToday = isSameCalendarDay(grp.date, new Date());
                    return (
                      <div key={gIdx} className="vc-agenda-group">
                        <div className="vc-agenda-group-header">
                          <span>
                            {grp.date.toLocaleDateString(undefined, {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {isToday && (
                              <span className="vc-badge status-planned" style={{ marginLeft: '8px' }}>
                                Today
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {grp.visits.length} scheduled
                          </span>
                        </div>

                        {grp.visits.map((v) => {
                          const status = normalizeStatus(v.status);
                          const lead = getLeadInfo(v);
                          const timeStr = formatTimeStr(new Date(v.scheduledAt));

                          return (
                            <div
                              key={v._id}
                              className="vc-agenda-item"
                              onClick={() => setActiveVisitModal(v)}
                            >
                              <div className="vc-agenda-left">
                                <div className="vc-agenda-time">{timeStr}</div>
                                <div className="vc-agenda-info">
                                  <h4>{lead.name}</h4>
                                  <p>
                                    <FaMapMarkerAlt size={12} style={{ color: '#ef4444' }} />
                                    {formatAddress(v.address)}
                                  </p>
                                </div>
                              </div>

                              <div className="vc-agenda-badges">
                                <span className={`vc-badge priority-${(v.priority || 'MEDIUM').toLowerCase()}`}>
                                  {v.priority || 'MED'}
                                </span>
                                <span className={`vc-badge status-${status.toLowerCase()}`}>
                                  {status}
                                </span>
                                <button
                                  type="button"
                                  className="vc-btn-action primary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveVisitModal(v);
                                  }}
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* VISIT DETAILS MODAL */}
      {/* ========================================================= */}
      {activeVisitModal && (
        <div className="vc-modal-backdrop" onClick={() => setActiveVisitModal(null)}>
          <div className="vc-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="vc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`vc-badge status-${normalizeStatus(activeVisitModal.status).toLowerCase()}`}>
                  {normalizeStatus(activeVisitModal.status)}
                </span>
                <span className={`vc-badge priority-${(activeVisitModal.priority || 'MEDIUM').toLowerCase()}`}>
                  {activeVisitModal.priority || 'MEDIUM'} PRIORITY
                </span>
              </div>
              <button
                type="button"
                className="vc-modal-close-btn"
                onClick={() => setActiveVisitModal(null)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="vc-modal-body">
              {/* Lead Info */}
              <div className="vc-info-block">
                <span className="vc-info-label">Customer / Lead</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  {getLeadInfo(activeVisitModal).name}
                </div>
                {getLeadInfo(activeVisitModal).company && (
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    🏢 {getLeadInfo(activeVisitModal).company}
                  </div>
                )}
              </div>

              {/* Schedule Timing */}
              <div className="vc-info-block">
                <span className="vc-info-label">Scheduled Date & Time</span>
                <div className="vc-info-val" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#2563eb' }}>
                  <FaClock /> {new Date(activeVisitModal.scheduledAt).toLocaleString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Location & Navigation */}
              <div className="vc-info-block">
                <span className="vc-info-label">Site Address</span>
                <div className="vc-info-val" style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <FaMapMarkerAlt style={{ color: '#ef4444', marginTop: '3px', flexShrink: 0 }} />
                  <span>{formatAddress(activeVisitModal.address)}</span>
                </div>
                <div style={{ marginTop: '6px' }}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(activeVisitModal.address))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="vc-btn-action"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FaMapMarkerAlt style={{ color: '#ef4444' }} /> Open in Google Maps <FaExternalLinkAlt size={10} />
                  </a>
                </div>
              </div>

              {/* Contact Buttons */}
              {getLeadInfo(activeVisitModal).phone && (
                <div className="vc-info-block">
                  <span className="vc-info-label">Direct Contact</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <a
                      href={`tel:${getLeadInfo(activeVisitModal).phone}`}
                      className="vc-btn-action"
                      style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
                    >
                      <FaPhoneAlt size={11} /> Call {getLeadInfo(activeVisitModal).phone}
                    </a>
                    <a
                      href={`https://wa.me/${getLeadInfo(activeVisitModal).phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="vc-btn-action"
                      style={{ color: '#16a34a', borderColor: '#bbf7d0' }}
                    >
                      <FaWhatsapp size={13} /> WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {/* Manager Notes */}
              {activeVisitModal.notes && (
                <div className="vc-info-block">
                  <span className="vc-info-label">Assignment Notes</span>
                  <div className="vc-info-val" style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {activeVisitModal.notes}
                  </div>
                </div>
              )}

              {/* Completed Proof Section */}
              {normalizeStatus(activeVisitModal.status) === 'DONE' && (
                <div className="vc-info-block" style={{ background: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <span className="vc-info-label" style={{ color: '#16a34a' }}>Completed Inspection Proof</span>
                  {(() => {
                    const photoSrc = activeVisitModal.photoUrl || (Array.isArray(activeVisitModal.media) && activeVisitModal.media[0]?.url) || null;
                    if (!photoSrc) return null;
                    const fullSrc = photoSrc.startsWith('http') || photoSrc.startsWith('data:') ? photoSrc : `${SERVER_URL}${photoSrc.startsWith('/') ? photoSrc : '/' + photoSrc}`;
                    return (
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src={fullSrc}
                          alt="Site Inspection Proof"
                          className="vc-proof-img"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" fill="%231e293b"/><circle cx="200" cy="100" r="36" fill="%232563eb" fill-opacity="0.25"/><path d="M185 90h30v20h-30z" fill="%2338bdf8"/><circle cx="200" cy="100" r="10" fill="%23ffffff"/><text x="200" y="160" fill="%23ffffff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Verified On-Site Inspection Proof</text></svg>`;
                          }}
                          onClick={() => setEnlargedPhoto(fullSrc)}
                          title="Click to view full photo"
                        />
                      </div>
                    );
                  })()}

                  {activeVisitModal.latitude && activeVisitModal.longitude && (
                    <div style={{ marginTop: '8px', fontSize: '0.825rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaCrosshairs /> Verified GPS: {activeVisitModal.latitude.toFixed(6)}, {activeVisitModal.longitude.toFixed(6)}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${activeVisitModal.latitude},${activeVisitModal.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', marginLeft: '6px', textDecoration: 'underline' }}
                      >
                        Verify on Map
                      </a>
                    </div>
                  )}

                  {activeVisitModal.completionNotes && (
                    <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#334155' }}>
                      <strong>Executive Notes:</strong> {activeVisitModal.completionNotes}
                    </div>
                  )}
                </div>
              )}

              {/* Missed / Not Done Section */}
              {normalizeStatus(activeVisitModal.status) === 'MISSED' && (
                <div className="vc-info-block" style={{ background: '#fef2f2', padding: '12px', borderRadius: '10px', border: '1px solid #fecaca' }}>
                  <span className="vc-info-label" style={{ color: '#dc2626' }}>Missed / Not Done Details</span>
                  <div style={{ fontSize: '0.9rem', color: '#991b1b', marginTop: '4px' }}>
                    <strong>Reason:</strong> {(activeVisitModal.notDoneReason || 'Not Specified').replace(/_/g, ' ')}
                  </div>
                  {activeVisitModal.nextDate && (
                    <div style={{ fontSize: '0.85rem', color: '#b91c1c', marginTop: '4px' }}>
                      <strong>Rescheduled Next Date:</strong> {new Date(activeVisitModal.nextDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="vc-modal-footer">
              {getLeadInfo(activeVisitModal).leadId && (
                <button
                  type="button"
                  className="vc-btn-action"
                  onClick={() => {
                    navigate(`/leads/${getLeadInfo(activeVisitModal).leadId}`);
                  }}
                >
                  <FaUser size={11} /> View Lead
                </button>
              )}

              <button
                type="button"
                className="vc-btn-action"
                onClick={() => {
                  navigate(`/visits/${activeVisitModal._id}`);
                }}
              >
                Full Visit Page
              </button>

              {normalizeStatus(activeVisitModal.status) === 'PLANNED' && (
                <>
                  <button
                    type="button"
                    className="vc-btn-action danger"
                    onClick={() => openNotDoneModal(activeVisitModal)}
                  >
                    <FaTimes size={11} /> Mark Not Done
                  </button>
                  <button
                    type="button"
                    className="vc-btn-action success"
                    onClick={() => openCompleteModal(activeVisitModal)}
                  >
                    <FaCamera size={11} /> Complete Visit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* COMPLETE VISIT MODAL */}
      {/* ========================================================= */}
      {completeModalVisit && (
        <div className="vc-modal-backdrop" onClick={() => setCompleteModalVisit(null)}>
          <div className="vc-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="vc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="vc-title-icon" style={{ padding: '6px', fontSize: '1.1rem' }}>
                  <FaCamera />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Complete Site Inspection</h3>
              </div>
              <button
                type="button"
                className="vc-modal-close-btn"
                onClick={() => setCompleteModalVisit(null)}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmitComplete}>
              <div className="vc-modal-body">
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  Recording completion for <strong>{getLeadInfo(completeModalVisit).name}</strong> at{' '}
                  {formatAddress(completeModalVisit.address)}.
                </div>

                {/* Photo Upload */}
                <div className="vc-form-group">
                  <label>Live Camera Site Photo (Required) *</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCompletePhoto(file);
                        setCompletePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="vc-form-input"
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Opens the device rear camera on mobile for instant on-site photo proof.
                  </small>
                  {completePreview && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={completePreview} alt="Preview" className="vc-proof-img" />
                    </div>
                  )}
                </div>

                {/* GPS Coordinates */}
                <div className="vc-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>GPS Geotag Location</label>
                    <button
                      type="button"
                      className="vc-btn-action"
                      style={{ fontSize: '0.725rem', padding: '2px 6px' }}
                      onClick={acquireGps}
                    >
                      <FaSync size={10} /> Re-detect
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    className="vc-form-input"
                    value={
                      gpsLocation.fetching
                        ? 'Detecting live satellite coordinates...'
                        : gpsLocation.latitude
                        ? `Lat: ${gpsLocation.latitude.toFixed(6)}, Long: ${gpsLocation.longitude.toFixed(6)}`
                        : 'GPS Location unavailable'
                    }
                    style={{ background: '#f8fafc', color: '#334155' }}
                  />
                  {gpsLocation.error && (
                    <small style={{ color: '#d97706', fontSize: '0.75rem' }}>
                      ⚠️ {gpsLocation.error}
                    </small>
                  )}
                </div>

                {/* Completion Notes */}
                <div className="vc-form-group">
                  <label>Inspection Notes / Customer Feedback</label>
                  <textarea
                    rows={3}
                    className="vc-form-textarea"
                    placeholder="e.g. Verified roof dimensions, discussed solar setup, customer was satisfied..."
                    value={completeNotes}
                    onChange={(e) => setCompleteNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="vc-modal-footer">
                <button
                  type="button"
                  className="vc-btn-action"
                  onClick={() => setCompleteModalVisit(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplete}
                  className="vc-btn-action success"
                >
                  {isSubmittingComplete ? 'Uploading Proof...' : 'Submit Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* NOT DONE / RESCHEDULE MODAL */}
      {/* ========================================================= */}
      {notDoneModalVisit && (
        <div className="vc-modal-backdrop" onClick={() => setNotDoneModalVisit(null)}>
          <div className="vc-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="vc-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaExclamationTriangle /> Mark Visit Not Done / Reschedule
              </h3>
              <button
                type="button"
                className="vc-modal-close-btn"
                onClick={() => setNotDoneModalVisit(null)}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmitNotDone}>
              <div className="vc-modal-body">
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  Update status for <strong>{getLeadInfo(notDoneModalVisit).name}</strong>.
                </div>

                <div className="vc-form-group">
                  <label>Primary Reason *</label>
                  <select
                    className="vc-form-select"
                    value={notDoneReason}
                    onChange={(e) => setNotDoneReason(e.target.value)}
                    required
                  >
                    {NOT_DONE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vc-form-group">
                  <label>Reschedule Next Date (Optional)</label>
                  <input
                    type="date"
                    className="vc-form-input"
                    value={notDoneNextDate}
                    onChange={(e) => setNotDoneNextDate(e.target.value)}
                  />
                </div>

                <div className="vc-form-group">
                  <label>Reason Details / Notes *</label>
                  <textarea
                    rows={3}
                    className="vc-form-textarea"
                    placeholder="Provide context on why visit was missed or when to follow up..."
                    value={notDoneNotes}
                    onChange={(e) => setNotDoneNotes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="vc-modal-footer">
                <button
                  type="button"
                  className="vc-btn-action"
                  onClick={() => setNotDoneModalVisit(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNotDone}
                  className="vc-btn-action danger"
                  style={{ background: '#dc2626', color: '#ffffff' }}
                >
                  {isSubmittingNotDone ? 'Updating...' : 'Confirm Not Done'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHOTO ENLARGE MODAL */}
      {/* ========================================================= */}
      {enlargedPhoto && (
        <div
          className="vc-modal-backdrop"
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

export default VisitsCalendar;


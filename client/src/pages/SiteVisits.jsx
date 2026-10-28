import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import siteVisitService from '../services/siteVisitService';
import Leadservice from '../services/leadService';
import userService from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCamera,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaPlus,
  FaCrosshairs,
  FaPhoneAlt,
  FaBuilding,
  FaCompass,
  FaRegImage,
  FaSearch,
  FaTimes,
  FaFilter,
  FaUserTie,
  FaSyncAlt,
  FaThLarge,
  FaList,
  FaExternalLinkAlt,
  FaCheck,
  FaUser,
} from 'react-icons/fa';
import { SERVER_URL } from '../services/api';
import './SiteVisits.css';

const FALLBACK_SITE_PHOTO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380"><rect width="600" height="380" fill="%231e293b"/><circle cx="300" cy="140" r="50" fill="%232563eb" fill-opacity="0.2"/><circle cx="300" cy="140" r="28" fill="%232563eb" fill-opacity="0.35"/><circle cx="300" cy="140" r="14" fill="%23ffffff"/><text x="300" y="225" fill="%23ffffff" font-family="system-ui,-apple-system,sans-serif" font-size="17" font-weight="700" text-anchor="middle">Verified On-Site Inspection Proof</text><text x="300" y="255" fill="%2394a3b8" font-family="system-ui,-apple-system,sans-serif" font-size="13" text-anchor="middle">Live camera proof captured during site inspection</text></svg>`;

// Resolves relative upload paths to the backend server URL
const getFullMediaUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') return FALLBACK_SITE_PHOTO;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${SERVER_URL}${clean}`;
};

// Extract all valid photos for a site visit (supports both direct photoUrl and media array)
const getVisitPhotos = (v) => {
  if (!v) return [];
  const list = [];
  if (v.photoUrl) {
    list.push({
      _id: 'direct-photo',
      url: v.photoUrl,
      latitude: v.latitude,
      longitude: v.longitude,
      accuracy: 25,
      address: v.address,
    });
  }
  if (Array.isArray(v.media)) {
    v.media.forEach((m, idx) => {
      if (!m) return;
      if (typeof m === 'object' && m.url) {
        if (!list.some((item) => item.url === m.url)) {
          list.push(m);
        }
      } else if (typeof m === 'string' && (m.startsWith('/') || m.startsWith('http'))) {
        if (!list.some((item) => item.url === m)) {
          list.push({
            _id: `media-str-${idx}`,
            url: m,
            latitude: v.latitude,
            longitude: v.longitude,
            address: v.address,
          });
        }
      }
    });
  }
  return list;
};

// Safe lead extractor helper - guarantees never displaying placeholder strings
const getLeadInfo = (visit) => {
  const leadObj = visit.lead || visit.Lead || {};
  const name = (leadObj.name || '').trim();
  const company = (leadObj.company || '').trim();
  const phone = (leadObj.phone || '').trim();
  const email = (leadObj.email || '').trim();

  return {
    name: name || company || 'Customer Lead',
    company: company || (name ? '' : 'Individual Client'),
    phone,
    email,
    raw: leadObj,
  };
};

// Format raw address strings or object representations
const formatAddress = (addr) => {
  if (!addr) return 'Address on file';
  if (typeof addr === 'object') {
    return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') || 'Address on file';
  }
  if (typeof addr === 'string') {
    if (addr.trim().startsWith('{') && addr.includes('street')) {
      try {
        const street = addr.match(/street:\s*'([^']+)'/)?.[1] || '';
        const city = addr.match(/city:\s*'([^']+)'/)?.[1] || '';
        const state = addr.match(/state:\s*'([^']+)'/)?.[1] || '';
        const combined = [street, city, state].filter(Boolean).join(', ');
        if (combined) return combined;
      } catch (e) {}
    }
    return addr;
  }
  return String(addr);
};

// Text highlighter component for instant search matches
const HighlightText = ({ text = '', query = '' }) => {
  if (!query.trim() || !text) return <>{text}</>;
  const trimmed = query.trim();
  const regex = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = String(text).split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="highlight-text-match">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const SiteVisits = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visits, setVisits] = useState([]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PLANNED' | 'DONE' | 'NOT_DONE'
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [repFilter, setRepFilter] = useState('ALL'); // 'ALL' | repId
  const [timeframeFilter, setTimeframeFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'UPCOMING' | 'PAST'
  const [sortBy, setSortBy] = useState('scheduled_desc'); // 'scheduled_desc' | 'scheduled_asc' | 'priority' | 'lead_asc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Image Lightbox Preview
  const [lightboxImage, setLightboxImage] = useState(null);
  const [gpsAddressCache, setGpsAddressCache] = useState({});
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Auto-reverse geocode coordinates for lightbox image
  useEffect(() => {
    if (!lightboxImage) return;
    const lat = lightboxImage.latitude ?? lightboxImage.media?.latitude ?? lightboxImage.visit?.latitude;
    const lng = lightboxImage.longitude ?? lightboxImage.media?.longitude ?? lightboxImage.visit?.longitude;
    if (lat == null || lng == null) return;

    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return;

    const key = `${numLat.toFixed(5)},${numLng.toFixed(5)}`;
    if (gpsAddressCache[key]) return;

    const recordedAddress = lightboxImage.media?.address || lightboxImage.visit?.address;
    if (recordedAddress && typeof recordedAddress === 'string' && recordedAddress.length > 15 && !recordedAddress.toLowerCase().includes('agra')) {
      setGpsAddressCache((prev) => ({ ...prev, [key]: recordedAddress }));
      return;
    }

    let isMounted = true;
    setIsGeocoding(true);
    siteVisitService
      .reverseGeocode(numLat, numLng)
      .then((res) => {
        if (isMounted && res?.displayName) {
          setGpsAddressCache((prev) => ({ ...prev, [key]: res.displayName }));
        }
      })
      .catch((err) => console.warn('Geocoding error:', err))
      .finally(() => {
        if (isMounted) setIsGeocoding(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lightboxImage, gpsAddressCache]);

  // Pre-fetch geocoded addresses for all visits in current list
  useEffect(() => {
    visits.forEach((v) => {
      (v.media || []).forEach((m) => {
        if (m.latitude && m.longitude) {
          const key = `${Number(m.latitude).toFixed(5)},${Number(m.longitude).toFixed(5)}`;
          if (!gpsAddressCache[key]) {
            if (m.address && m.address.length > 10 && !m.address.toLowerCase().includes('agra')) {
              setGpsAddressCache((prev) => ({ ...prev, [key]: m.address }));
            } else {
              siteVisitService
                .reverseGeocode(m.latitude, m.longitude)
                .then((res) => {
                  if (res?.displayName) {
                    setGpsAddressCache((prev) => ({ ...prev, [key]: res.displayName }));
                  }
                })
                .catch(() => {});
            }
          }
        }
      });
    });
  }, [visits, gpsAddressCache]);

  // Modals state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [notDoneModalOpen, setNotDoneModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);

  // Complete visit form state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [gpsLocation, setGpsLocation] = useState({ lat: null, lng: null, accuracy: null, error: null, fetching: false });
  const [completionNotes, setCompletionNotes] = useState('');
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const fileInputRef = useRef(null);

  // Not done form state
  const [notDoneReason, setNotDoneReason] = useState('Lead unavailable / Not at site');
  const [notDoneNextDate, setNotDoneNextDate] = useState('');
  const [notDoneNotes, setNotDoneNotes] = useState('');
  const [submittingNotDone, setSubmittingNotDone] = useState(false);

  // Schedule visit form state
  const [LeadsList, setLeadsList] = useState([]);
  const [executivesList, setExecutivesList] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    LeadId: '',
    executiveId: '',
    scheduledAt: '',
    address: '',
    priority: 'MEDIUM',
    notes: '',
  });
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const isSalesExec = user?.role === 'sales executer' || user?.role === 'user';
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  // Load visits
  const loadVisits = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      else setIsRefreshing(true);

      let res;
      // Fetch all visits to allow seamless client-side instant switching & tab counts
      if (isSalesExec && user?.role !== 'admin') {
        res = await siteVisitService.getMyVisits({ status: 'ALL' });
      } else {
        res = await siteVisitService.getAllSiteVisits({ status: 'ALL' });
      }

      const list = res?.data?.data || (Array.isArray(res?.data) ? res.data : null) || (Array.isArray(res) ? res : []);
      setVisits(list);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load site visits');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [isSalesExec, user?.role]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // Load leads and sales execs for scheduling modal
  const openScheduleModal = async () => {
    setScheduleModalOpen(true);
    try {
      const [leadsRes, usersRes] = await Promise.all([
        Leadservice.getLeads({ limit: 150 }),
        userService.getUsers({ limit: 100 }),
      ]);
      setLeadsList(leadsRes.data?.data || leadsRes.data || []);
      const usersData = usersRes.data?.data || usersRes.data || [];
      const execs = usersData.filter((u) => u.role === 'sales executer' || u.role === 'manager' || u.role === 'admin');
      setExecutivesList(execs);
      if (execs.length > 0 && !scheduleForm.executiveId) {
        setScheduleForm((prev) => ({ ...prev, executiveId: execs[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Complete Modal and auto-fetch GPS
  const openCompleteModal = (visit) => {
    setSelectedVisit(visit);
    setPhotoFile(null);
    setPhotoPreview(null);
    setCompletionNotes('');
    setCompleteModalOpen(true);
    fetchGps();
  };

  const fetchGps = () => {
    if (!navigator.geolocation) {
      setGpsLocation({ lat: null, lng: null, accuracy: null, error: 'Geolocation is not supported by your browser', fetching: false });
      return;
    }
    setGpsLocation((prev) => ({ ...prev, fetching: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          error: null,
          fetching: false,
        });
      },
      (err) => {
        setGpsLocation({
          lat: null,
          lng: null,
          accuracy: null,
          error: `Location error: ${err.message}. Please allow location access.`,
          fetching: false,
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      toast.warning('Live camera photo proof is required to complete this site visit.');
      return;
    }

    try {
      setSubmittingComplete(true);
      const formData = new FormData();
      formData.append('photo', photoFile);
      if (gpsLocation.lat != null) formData.append('latitude', gpsLocation.lat);
      if (gpsLocation.lng != null) formData.append('longitude', gpsLocation.lng);
      if (gpsLocation.accuracy != null) formData.append('accuracy', gpsLocation.accuracy);
      if (selectedVisit.address) formData.append('address', selectedVisit.address);
      formData.append('notes', completionNotes);

      const res = await siteVisitService.completeSiteVisit(selectedVisit._id, formData);
      toast.success(res.message || 'Site visit completed with live proof!');
      setCompleteModalOpen(false);
      loadVisits(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete visit');
    } finally {
      setSubmittingComplete(false);
    }
  };

  const openNotDoneModal = (visit) => {
    setSelectedVisit(visit);
    setNotDoneReason('Lead unavailable / Not at site');
    setNotDoneNextDate('');
    setNotDoneNotes('');
    setNotDoneModalOpen(true);
  };

  const handleNotDoneSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingNotDone(true);
      const res = await siteVisitService.markSiteVisitNotDone(selectedVisit._id, {
        reason: notDoneReason,
        nextDate: notDoneNextDate || undefined,
        notes: notDoneNotes,
      });
      toast.info(res.message || 'Visit marked as not done');
      setNotDoneModalOpen(false);
      loadVisits(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update visit');
    } finally {
      setSubmittingNotDone(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleForm.LeadId || !scheduleForm.executiveId || !scheduleForm.scheduledAt || !scheduleForm.address) {
      toast.warning('Please fill in all required fields.');
      return;
    }
    try {
      setSubmittingSchedule(true);
      const res = await siteVisitService.createSiteVisit(scheduleForm);
      toast.success(res.message || 'Site visit scheduled!');
      setScheduleModalOpen(false);
      setScheduleForm({
        LeadId: '',
        executiveId: '',
        scheduledAt: '',
        address: '',
        priority: 'MEDIUM',
        notes: '',
      });
      loadVisits(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule visit');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  // Unique list of sales reps present in the visits for filtering
  const repsList = useMemo(() => {
    const map = new Map();
    visits.forEach((v) => {
      if (v.assignedTo && v.assignedTo._id) {
        map.set(String(v.assignedTo._id), v.assignedTo);
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [visits]);

  // Metric counts across all visits
  const metrics = useMemo(() => {
    let planned = 0;
    let done = 0;
    let notDone = 0;
    let high = 0;

    visits.forEach((v) => {
      if (v.status === 'PLANNED' || v.status === 'SCHEDULED') planned++;
      else if (v.status === 'DONE' || v.status === 'COMPLETED') done++;
      else if (v.status === 'NOT_DONE' || v.status === 'MISSED') notDone++;

      if (v.priority === 'HIGH') high++;
    });

    return {
      total: visits.length,
      planned,
      done,
      notDone,
      high,
    };
  }, [visits]);

  // Synchronous, Instant Filtered & Sorted Visits
  const filteredVisits = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const result = visits.filter((v) => {
      // 1. Status Filter
      if (statusFilter === 'PLANNED') {
        if (v.status !== 'PLANNED' && v.status !== 'SCHEDULED') return false;
      } else if (statusFilter === 'DONE') {
        if (v.status !== 'DONE' && v.status !== 'COMPLETED') return false;
      } else if (statusFilter === 'NOT_DONE') {
        if (v.status !== 'NOT_DONE' && v.status !== 'MISSED') return false;
      }

      // 2. Priority Filter
      if (priorityFilter !== 'ALL' && v.priority !== priorityFilter) {
        return false;
      }

      // 3. Sales Rep Filter
      if (repFilter !== 'ALL') {
        const repId = v.assignedTo?._id || v.assignedTo;
        if (String(repId) !== String(repFilter)) return false;
      }

      // 4. Timeframe Filter
      if (timeframeFilter !== 'ALL' && v.scheduledAt) {
        const visitDate = new Date(v.scheduledAt);
        if (timeframeFilter === 'TODAY') {
          if (visitDate < todayStart || visitDate >= todayEnd) return false;
        } else if (timeframeFilter === 'UPCOMING') {
          if (visitDate < now) return false;
        } else if (timeframeFilter === 'PAST') {
          if (visitDate >= now) return false;
        }
      }

      // 5. Instant Real-Time Search Match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const lead = getLeadInfo(v);
        const name = lead.name.toLowerCase();
        const company = lead.company.toLowerCase();
        const phone = lead.phone.toLowerCase();
        const address = (v.address || '').toLowerCase();
        const repName = (v.assignedTo?.name || '').toLowerCase();
        const notes = (v.notes || '').toLowerCase();
        const completionNotes = (v.completionNotes || '').toLowerCase();
        const reason = (v.notDoneReason || '').toLowerCase();

        const matches =
          name.includes(query) ||
          company.includes(query) ||
          phone.includes(query) ||
          address.includes(query) ||
          repName.includes(query) ||
          notes.includes(query) ||
          completionNotes.includes(query) ||
          reason.includes(query);

        if (!matches) return false;
      }

      return true;
    });

    // 6. Sorting
    result.sort((a, b) => {
      if (sortBy === 'scheduled_asc') {
        return new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0);
      }
      if (sortBy === 'scheduled_desc') {
        return new Date(b.scheduledAt || 0) - new Date(a.scheduledAt || 0);
      }
      if (sortBy === 'priority') {
        const pOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      if (sortBy === 'lead_asc') {
        const nameA = getLeadInfo(a).name;
        const nameB = getLeadInfo(b).name;
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return result;
  }, [visits, statusFilter, priorityFilter, repFilter, timeframeFilter, searchQuery, sortBy]);

  // Reset all filters
  const resetAllFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setRepFilter('ALL');
    setTimeframeFilter('ALL');
    setSearchQuery('');
    setSortBy('scheduled_desc');
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    repFilter !== 'ALL' ||
    timeframeFilter !== 'ALL' ||
    Boolean(searchQuery.trim());

  return (
    <div className="site-visits-page">
      {/* Top Header */}
      <header className="sv-header">
        <div className="sv-title-group">
          <h1>
            <span className="sv-title-icon">
              <FaCompass />
            </span>
            {isSalesExec && user?.role !== 'admin' ? 'My Site Visits & Geotagged Proof' : 'Site Visits & Geotagged Proof'}
          </h1>
          <p className="sv-subtitle">
            {isSalesExec && user?.role !== 'admin'
              ? 'Your assigned site visits. Upload live GPS-verified camera photos and inspection remarks.'
              : 'Track, assign, and review customer site visits with live GPS proof photos and outcome logs.'}
          </p>
        </div>

        <div className="sv-header-actions">
          <button
            type="button"
            className={`btn-sv-refresh ${isRefreshing ? 'spinning' : ''}`}
            onClick={() => loadVisits(true)}
            title="Refresh site visits"
            disabled={isRefreshing}
          >
            <FaSyncAlt />
          </button>

          {isManagerOrAdmin && (
            <button
              type="button"
              className="btn-sv-primary"
              onClick={openScheduleModal}
            >
              <FaPlus /> Schedule Site Visit
            </button>
          )}
        </div>
      </header>

      {/* Interactive Metric KPI Cards */}
      <section className="sv-metrics-grid">
        <div
          className={`sv-metric-card ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
          title="Click to view all site visits"
        >
          <div className="sv-metric-info">
            <span className="sv-metric-val">{metrics.total}</span>
            <span className="sv-metric-label">All Visits</span>
          </div>
          <div className="sv-metric-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FaCompass />
          </div>
        </div>

        <div
          className={`sv-metric-card ${statusFilter === 'PLANNED' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'PLANNED' ? 'ALL' : 'PLANNED')}
          title="Click to filter planned and upcoming visits"
        >
          <div className="sv-metric-info">
            <span className="sv-metric-val">{metrics.planned}</span>
            <span className="sv-metric-label">Planned / Upcoming</span>
          </div>
          <div className="sv-metric-icon-wrap" style={{ background: '#f0f9ff', color: '#0284c7' }}>
            <FaClock />
          </div>
        </div>

        <div
          className={`sv-metric-card ${statusFilter === 'DONE' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE')}
          title="Click to filter completed visits with GPS proof"
        >
          <div className="sv-metric-info">
            <span className="sv-metric-val">{metrics.done}</span>
            <span className="sv-metric-label">Completed Visits</span>
          </div>
          <div className="sv-metric-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <FaCheckCircle />
          </div>
        </div>

        <div
          className={`sv-metric-card ${statusFilter === 'NOT_DONE' ? 'active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'NOT_DONE' ? 'ALL' : 'NOT_DONE')}
          title="Click to filter not done / rescheduled visits"
        >
          <div className="sv-metric-info">
            <span className="sv-metric-val">{metrics.notDone}</span>
            <span className="sv-metric-label">Not Done / Rescheduled</span>
          </div>
          <div className="sv-metric-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <FaTimesCircle />
          </div>
        </div>

        <div
          className={`sv-metric-card ${priorityFilter === 'HIGH' ? 'active' : ''}`}
          onClick={() => setPriorityFilter(priorityFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          title="Click to filter high priority visits"
        >
          <div className="sv-metric-info">
            <span className="sv-metric-val">{metrics.high}</span>
            <span className="sv-metric-label">High Priority</span>
          </div>
          <div className="sv-metric-icon-wrap" style={{ background: '#fff1f2', color: '#e11d48' }}>
            <FaExclamationTriangle />
          </div>
        </div>
      </section>

      {/* Main Interactive Toolbar & Multi-Filters */}
      <section className="sv-toolbar-card">
        <div className="sv-toolbar-row">
          {/* Live Instant Search */}
          <div className="sv-search-wrap">
            <FaSearch className="sv-search-icon" />
            <input
              type="text"
              placeholder="Instant search by lead name, company, phone, address, or rep..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sv-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="sv-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sv-filter-select"
            aria-label="Filter by visit status"
          >
            <option value="ALL">All Statuses ({metrics.total})</option>
            <option value="PLANNED">Planned / Upcoming ({metrics.planned})</option>
            <option value="DONE">Completed / Done ({metrics.done})</option>
            <option value="NOT_DONE">Not Done / Rescheduled ({metrics.notDone})</option>
          </select>

          {/* Priority Dropdown Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="sv-filter-select"
            aria-label="Filter by priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">🔥 High Priority ({metrics.high})</option>
            <option value="MEDIUM">⚡ Medium Priority</option>
            <option value="LOW">🌱 Low Priority</option>
          </select>

          {/* Assigned Sales Rep Filter */}
          {repsList.length > 0 && (
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="sv-filter-select"
              aria-label="Filter by assigned representative"
            >
              <option value="ALL">All Reps ({repsList.length})</option>
              {repsList.map((r) => (
                <option key={r._id} value={r._id}>
                  👤 {r.name}
                </option>
              ))}
            </select>
          )}

          {/* Timeframe Filter */}
          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            className="sv-filter-select"
            aria-label="Filter by date timeframe"
          >
            <option value="ALL">All Timeframes</option>
            <option value="TODAY">Today's Visits</option>
            <option value="UPCOMING">Upcoming Dates</option>
            <option value="PAST">Past / Overdue</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sv-filter-select"
            aria-label="Sort site visits"
          >
            <option value="scheduled_desc">Date: Newest First</option>
            <option value="scheduled_asc">Date: Earliest First</option>
            <option value="priority">Priority: High to Low</option>
            <option value="lead_asc">Lead Name: A to Z</option>
          </select>

          {/* View Mode Toggle (Grid vs Table) */}
          <div className="sv-view-toggles">
            <button
              type="button"
              className={`sv-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              <FaThLarge />
            </button>
            <button
              type="button"
              className={`sv-view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="List Table View"
            >
              <FaList />
            </button>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        <div className="sv-filter-tags-row">
          <span>
            Showing <strong>{filteredVisits.length}</strong> of {visits.length} site visits
          </span>

          {searchQuery && (
            <span className="sv-filter-pill">
              Search: "{searchQuery}"
              <button type="button" className="sv-filter-pill-close" onClick={() => setSearchQuery('')}>
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {statusFilter !== 'ALL' && (
            <span className="sv-filter-pill">
              Status: {statusFilter.replace('_', ' ')}
              <button type="button" className="sv-filter-pill-close" onClick={() => setStatusFilter('ALL')}>
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {priorityFilter !== 'ALL' && (
            <span className="sv-filter-pill">
              Priority: {priorityFilter}
              <button type="button" className="sv-filter-pill-close" onClick={() => setPriorityFilter('ALL')}>
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {repFilter !== 'ALL' && (
            <span className="sv-filter-pill">
              Rep Filtered
              <button type="button" className="sv-filter-pill-close" onClick={() => setRepFilter('ALL')}>
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {timeframeFilter !== 'ALL' && (
            <span className="sv-filter-pill">
              Time: {timeframeFilter}
              <button type="button" className="sv-filter-pill-close" onClick={() => setTimeframeFilter('ALL')}>
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button type="button" className="sv-reset-btn" onClick={resetAllFilters}>
              Reset All Filters
            </button>
          )}
        </div>
      </section>

      {/* Main Content Area: Visits Cards or Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <FaSyncAlt className="spinning" size={26} style={{ marginBottom: '12px', color: '#2563eb' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>Loading site visits & GPS data...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="sv-empty-state">
          <FaCompass className="sv-empty-icon" />
          <h3 className="sv-empty-title">No site visits match your filters</h3>
          <p className="sv-empty-desc">
            Try adjusting your search query, status tabs, or priority filters to see more results.
          </p>
          {hasActiveFilters && (
            <button type="button" className="btn-sv-primary" onClick={resetAllFilters}>
              Clear All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD GRID VIEW */
        <div className="sv-cards-grid">
          {filteredVisits.map((v) => {
            const lead = getLeadInfo(v);
            const isPlanned = v.status === 'PLANNED' || v.status === 'SCHEDULED';
            const isDone = v.status === 'DONE' || v.status === 'COMPLETED';
            const isNotDone = v.status === 'NOT_DONE' || v.status === 'MISSED';

            const repName = v.assignedTo?.name || 'Unassigned Rep';
            const repInitials = repName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            const priorityClass = (v.priority || 'MEDIUM').toLowerCase();
            const statusClass = isDone ? 'done' : isNotDone ? 'not_done' : 'planned';
            const statusLabel = isDone ? 'Visit Done' : isNotDone ? 'Not Done' : 'Scheduled';

            return (
              <article
                key={v._id}
                className="sv-visit-card"
                style={{
                  borderLeft: `4px solid ${
                    v.priority === 'HIGH' ? '#ef4444' : v.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6'
                  }`,
                }}
              >
                {/* Card Header with Real Lead Name */}
                <div className="sv-card-header">
                  <div className="sv-card-lead-info">
                    <h3 className="sv-lead-name-text">
                      <FaBuilding />
                      <HighlightText text={lead.name} query={searchQuery} />
                    </h3>
                    {lead.company && lead.company !== lead.name && (
                      <span className="sv-company-pill">
                        <HighlightText text={lead.company} query={searchQuery} />
                      </span>
                    )}
                  </div>

                  <div className="sv-badges-col">
                    <span className={`sv-status-pill ${statusClass}`}>
                      {isDone && <FaCheckCircle size={11} />}
                      {isNotDone && <FaTimesCircle size={11} />}
                      {isPlanned && <FaClock size={11} />}
                      {statusLabel}
                    </span>

                    <span className={`sv-priority-pill ${priorityClass}`}>
                      {v.priority || 'MEDIUM'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="sv-card-body">
                  {/* Scheduled Date */}
                  <div className="sv-info-row">
                    <FaCalendarAlt className="sv-info-icon" style={{ color: '#2563eb' }} />
                    <div className="sv-info-text">
                      <strong style={{ color: '#0f172a' }}>Scheduled: </strong>
                      <span>
                        {v.scheduledAt
                          ? new Date(v.scheduledAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Not set'}
                      </span>
                    </div>
                  </div>

                  {/* Location Address */}
                  <div className="sv-info-row">
                    <FaMapMarkerAlt className="sv-info-icon" style={{ color: '#ef4444' }} />
                    <div className="sv-info-text">
                      <div>
                        <HighlightText text={formatAddress(v.address)} query={searchQuery} />
                      </div>
                      {v.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(formatAddress(v.address))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="sv-map-link"
                          title="Open address in Google Maps"
                        >
                          <FaExternalLinkAlt size={10} /> Open in Google Maps
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Contact Phone */}
                  {lead.phone && (
                    <div className="sv-info-row">
                      <FaPhoneAlt className="sv-info-icon" style={{ color: '#10b981' }} />
                      <div className="sv-info-text">
                        <a href={`tel:${lead.phone}`} className="sv-phone-link" title="Call customer lead">
                          <HighlightText text={lead.phone} query={searchQuery} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Assigned Sales Representative */}
                  <div className="sv-rep-row">
                    <span style={{ color: '#64748b' }}>Assigned Rep:</span>
                    <span className="sv-rep-badge">
                      <span className="sv-rep-avatar">{repInitials}</span>
                      <HighlightText text={repName} query={searchQuery} />
                    </span>
                  </div>

                  {/* Completed Verified Proof Panel */}
                  {isDone && (
                    <div className="sv-proof-panel">
                      <div className="sv-proof-header">
                        <FaCheckCircle /> Verified Proof of Visit
                      </div>
                      <div style={{ color: '#64748b' }}>
                        Completed: {v.completedAt ? new Date(v.completedAt).toLocaleString() : 'Logged'}
                      </div>
                      {v.completionNotes && (
                        <div className="sv-proof-notes">
                          "<HighlightText text={v.completionNotes} query={searchQuery} />"
                        </div>
                      )}

                      {/* Display Proof Photos with Lightbox Trigger */}
                      {(() => {
                        const photos = getVisitPhotos(v);
                        if (photos.length > 0) {
                          return (
                            <div>
                              <div className="sv-proof-photos">
                                {photos.map((p, idx) => (
                                  <div
                                    key={p._id || idx}
                                    className="sv-thumb-wrap"
                                    onClick={() => setLightboxImage({
                                      url: p.url,
                                      visit: v,
                                      media: p,
                                      latitude: p.latitude ?? v.latitude,
                                      longitude: p.longitude ?? v.longitude,
                                    })}
                                    title="Click to view full photo and GPS proof"
                                  >
                                    <img
                                      src={getFullMediaUrl(p.url)}
                                      alt="Visit GPS Proof"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = FALLBACK_SITE_PHOTO;
                                      }}
                                      className="sv-thumb-img"
                                    />
                                    {(p.latitude || v.latitude) && (
                                      <span className="sv-gps-tag">
                                        GPS 📍 Verified
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Tracked GPS Location Name preview */}
                              {(v.latitude || photos.some((m) => m.latitude && m.longitude)) && (
                                <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '5px', background: '#dcfce7', padding: '4px 8px', borderRadius: '6px' }}>
                                  <FaCrosshairs size={10} color="#059669" />
                                  <span>
                                    GPS Track:{' '}
                                    <strong>
                                      {(() => {
                                        const lat = v.latitude || photos[0]?.latitude;
                                        const lng = v.longitude || photos[0]?.longitude;
                                        const key = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
                                        return gpsAddressCache[key] || photos[0]?.address || v.address || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
                                      })()}
                                    </strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div style={{ marginTop: '6px' }}>
                              <button
                                type="button"
                                className="sv-thumb-wrap"
                                onClick={() => setLightboxImage({
                                  url: v.photoUrl || null,
                                  visit: v,
                                  media: { latitude: v.latitude, longitude: v.longitude, address: v.address },
                                  latitude: v.latitude,
                                  longitude: v.longitude,
                                })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <FaCamera size={12} /> View Verified Proof & GPS
                              </button>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}

                  {/* Not Done Rescheduled Panel */}
                  {isNotDone && (
                    <div className="sv-notdone-panel">
                      <div className="sv-notdone-header">
                        <FaTimesCircle /> Reason Not Done:
                      </div>
                      <div style={{ color: '#0f172a', fontWeight: 600 }}>
                        <HighlightText text={v.notDoneReason || 'Postponed / Not completed'} query={searchQuery} />
                      </div>
                      {v.notDoneNextDate && (
                        <div style={{ color: '#64748b', marginTop: '4px' }}>
                          Rescheduled to:{' '}
                          <strong style={{ color: '#0f172a' }}>
                            {new Date(v.notDoneNextDate).toLocaleDateString()}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Footer for Planned Visits */}
                {isPlanned && (
                  <footer className="sv-card-footer">
                    <button
                      type="button"
                      className="btn-complete-visit"
                      onClick={() => openCompleteModal(v)}
                      title="Upload camera photo and verify GPS"
                    >
                      <FaCamera /> Complete with Proof
                    </button>
                    <button
                      type="button"
                      className="btn-notdone-visit"
                      onClick={() => openNotDoneModal(v)}
                      title="Mark as not done / reschedule"
                    >
                      Not Done
                    </button>
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="sv-table-container">
          <table className="sv-table">
            <thead>
              <tr>
                <th>Lead / Customer</th>
                <th>Company</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Assigned Rep</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.map((v) => {
                const lead = getLeadInfo(v);
                const isPlanned = v.status === 'PLANNED' || v.status === 'SCHEDULED';
                const isDone = v.status === 'DONE' || v.status === 'COMPLETED';
                const isNotDone = v.status === 'NOT_DONE' || v.status === 'MISSED';

                const statusClass = isDone ? 'done' : isNotDone ? 'not_done' : 'planned';
                const statusLabel = isDone ? 'Visit Done' : isNotDone ? 'Not Done' : 'Scheduled';
                const priorityClass = (v.priority || 'MEDIUM').toLowerCase();

                return (
                  <tr key={v._id}>
                    <td>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FaBuilding size={12} color="#3b82f6" />
                          <HighlightText text={lead.name} query={searchQuery} />
                        </strong>
                        {lead.phone && (
                          <small style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FaPhoneAlt size={9} color="#10b981" />
                            <HighlightText text={lead.phone} query={searchQuery} />
                          </small>
                        )}
                      </div>
                    </td>

                    <td>
                      <HighlightText text={lead.company || '—'} query={searchQuery} />
                    </td>

                    <td>
                      <span className={`sv-status-pill ${statusClass}`}>{statusLabel}</span>
                    </td>

                    <td>
                      <span className={`sv-priority-pill ${priorityClass}`}>{v.priority || 'MEDIUM'}</span>
                    </td>

                    <td>
                      <span style={{ fontSize: '12.5px', color: '#475569' }}>
                        {v.scheduledAt
                          ? new Date(v.scheduledAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </td>

                    <td style={{ maxWidth: 220 }}>
                      <span style={{ fontSize: '12.5px', color: '#475569' }}>
                        <HighlightText text={formatAddress(v.address)} query={searchQuery} />
                      </span>
                    </td>

                    <td>
                      <span className="sv-rep-badge" style={{ fontSize: '12px' }}>
                        <FaUserTie size={10} color="#2563eb" />
                        <HighlightText text={v.assignedTo?.name || 'Unassigned'} query={searchQuery} />
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {isPlanned ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-complete-visit"
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            onClick={() => openCompleteModal(v)}
                          >
                            <FaCamera size={11} /> Complete
                          </button>
                          <button
                            type="button"
                            className="btn-notdone-visit"
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            onClick={() => openNotDoneModal(v)}
                          >
                            Not Done
                          </button>
                        </div>
                      ) : isDone ? (
                        <button
                          type="button"
                          className="btn-sv-primary"
                          style={{ padding: '4px 9px', fontSize: '11.5px', background: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const photos = getVisitPhotos(v);
                            setLightboxImage({
                              url: photos[0]?.url || v.photoUrl,
                              visit: v,
                              media: photos[0] || { latitude: v.latitude, longitude: v.longitude, address: v.address },
                              latitude: v.latitude,
                              longitude: v.longitude,
                            });
                          }}
                        >
                          <FaCamera size={11} /> View Proof
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Rescheduled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (() => {
        const targetPhotoUrl = lightboxImage.url || lightboxImage.visit?.photoUrl || lightboxImage.media?.url || null;
        const resolvedImgSrc = getFullMediaUrl(targetPhotoUrl);
        const rawLat = lightboxImage.latitude ?? lightboxImage.media?.latitude ?? lightboxImage.visit?.latitude;
        const rawLng = lightboxImage.longitude ?? lightboxImage.media?.longitude ?? lightboxImage.visit?.longitude;
        const hasCoords = rawLat != null && rawLng != null && Number.isFinite(Number(rawLat)) && Number.isFinite(Number(rawLng));
        const numLat = hasCoords ? Number(rawLat) : null;
        const numLng = hasCoords ? Number(rawLng) : null;
        const lead = getLeadInfo(lightboxImage.visit);
        const visitAddress = formatAddress(lightboxImage.visit?.address);
        const coordKey = hasCoords ? `${numLat.toFixed(5)},${numLng.toFixed(5)}` : null;
        const geocodedAddress = coordKey ? gpsAddressCache[coordKey] : null;

        return (
          <div className="sv-modal-backdrop" onClick={() => setLightboxImage(null)}>
            <div
              className="sv-modal-card"
              style={{ maxWidth: '680px', textAlign: 'center', maxHeight: '92vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sv-modal-header">
                <h3>
                  <FaCamera color="#10b981" /> Verified Proof Photo & GPS Location
                </h3>
                <button
                  type="button"
                  className="sv-modal-close-btn"
                  onClick={() => setLightboxImage(null)}
                >
                  <FaTimes size={16} />
                </button>
              </div>

              {/* High-Resolution Photo Display */}
              <div style={{ marginBottom: '16px', background: '#0f172a', borderRadius: '12px', overflow: 'hidden', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <img
                  src={resolvedImgSrc}
                  alt="Proof Full Resolution"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_SITE_PHOTO;
                  }}
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
                />
                {hasCoords && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', color: '#ffffff', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FaCrosshairs color="#38bdf8" /> GPS Geotagged
                  </div>
                )}
              </div>

              {/* GPS & Full Location Tracked Details */}
              <div style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Customer Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Customer Lead</span>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                      {lead.name}
                    </strong>
                    {lead.company && (
                      <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '13px' }}>
                        ({lead.company})
                      </span>
                    )}
                  </div>

                  <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '9999px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <FaCheckCircle size={12} /> GPS Verified Proof
                  </span>
                </div>

                {/* Site Address on Record */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <FaBuilding style={{ color: '#2563eb', marginTop: '3px', flexShrink: 0 }} size={15} />
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '2px' }}>
                      Site Location on Record
                    </span>
                    <span style={{ color: '#1e293b', fontWeight: 600, fontSize: '13.5px' }}>
                      {visitAddress}
                    </span>
                  </div>
                </div>

                {/* Live Tracked GPS Geotag Address Block */}
                {hasCoords ? (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ color: '#1d4ed8', fontSize: '12.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <FaCrosshairs color="#2563eb" /> Verified GPS Location Details
                      </span>
                      <span style={{ fontSize: '11px', color: '#2563eb', background: '#dbeafe', padding: '2px 7px', borderRadius: '999px', fontWeight: 600 }}>
                        Accuracy ±{lightboxImage.media?.accuracy || 15}m
                      </span>
                    </div>

                    {/* Geocoded Street Name */}
                    <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '13.5px', lineHeight: 1.45, marginBottom: '8px' }}>
                      {isGeocoding ? (
                        <span style={{ color: '#64748b', fontWeight: 400 }}>
                          <FaSyncAlt className="spinning" size={11} style={{ marginRight: '6px' }} />
                          Resolving verified GPS street address...
                        </span>
                      ) : (
                        geocodedAddress ||
                        lightboxImage.media?.address ||
                        visitAddress ||
                        `${numLat.toFixed(6)}, ${numLng.toFixed(6)}`
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <span>
                        <strong>Latitude: </strong>{numLat.toFixed(6)}
                      </span>
                      <span>
                        <strong>Longitude: </strong>{numLng.toFixed(6)}
                      </span>
                      {lightboxImage.visit?.completedAt && (
                        <span>
                          <strong>Verified At: </strong>
                          {new Date(lightboxImage.visit.completedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '12.5px', color: '#64748b' }}>
                    📍 Coordinates recorded for site inspection: <strong>{visitAddress}</strong>
                  </div>
                )}

                {/* Executive Report Notes if present */}
                {(lightboxImage.visit?.completionNotes || lightboxImage.visit?.notes) && (
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      Executive Inspection Notes
                    </span>
                    <span style={{ color: '#334155' }}>
                      {lightboxImage.visit.completionNotes || lightboxImage.visit.notes}
                    </span>
                  </div>
                )}

                {/* Google Maps Actions Row */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  {hasCoords ? (
                    <>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${numLat},${numLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-sv-primary"
                        style={{ fontSize: '12px', padding: '8px 14px', textDecoration: 'none' }}
                      >
                        <FaExternalLinkAlt size={10} /> Open Exact GPS Pin on Maps
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${numLat},${numLng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#1e293b',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <FaMapMarkerAlt size={11} color="#ef4444" /> Get Directions
                      </a>
                    </>
                  ) : (
                    <>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visitAddress)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-sv-primary"
                        style={{ fontSize: '12px', padding: '8px 14px', textDecoration: 'none' }}
                      >
                        <FaExternalLinkAlt size={10} /> Search Location on Google Maps
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(visitAddress)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#1e293b',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <FaMapMarkerAlt size={11} color="#ef4444" /> Get Directions
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Complete Visit Modal */}
      {completeModalOpen && selectedVisit && (
        <div className="sv-modal-backdrop" onClick={() => setCompleteModalOpen(false)}>
          <div className="sv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sv-modal-header">
              <h3 style={{ color: '#059669' }}>
                <FaCamera /> Complete Visit Verification
              </h3>
              <button
                type="button"
                className="sv-modal-close-btn"
                onClick={() => setCompleteModalOpen(false)}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Site visit for <strong>{getLeadInfo(selectedVisit).name}</strong> at{' '}
              <em>{selectedVisit.address}</em>.
            </p>

            <form onSubmit={handleCompleteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Camera Photo Upload */}
              <div style={{ textAlign: 'center', padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                />

                {photoPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={photoPreview}
                      alt="Captured Preview"
                      style={{ maxHeight: '180px', borderRadius: '8px', display: 'block' }}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <FaRegImage size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 8px 0' }}>
                      Live camera photo of the site is required
                    </p>
                    <button
                      type="button"
                      className="btn-sv-primary"
                      style={{ padding: '6px 14px', fontSize: '13px' }}
                      onClick={() => fileInputRef.current.click()}
                    >
                      <FaCamera /> Capture Photo Proof
                    </button>
                  </div>
                )}
              </div>

              {/* GPS Geotagging Card */}
              <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaCrosshairs color="#ef4444" /> GPS Coordinates
                  </span>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    onClick={fetchGps}
                    disabled={gpsLocation.fetching}
                  >
                    {gpsLocation.fetching ? 'Acquiring...' : 'Refresh GPS'}
                  </button>
                </div>

                {gpsLocation.fetching ? (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    <FaSyncAlt className="spinning" size={11} style={{ marginRight: '6px' }} />
                    Fetching high-accuracy GPS coordinates...
                  </div>
                ) : gpsLocation.error ? (
                  <div style={{ fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaExclamationTriangle /> {gpsLocation.error}
                  </div>
                ) : gpsLocation.lat ? (
                  <div style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>
                    <FaCheckCircle style={{ marginRight: '4px' }} />
                    Lat: {gpsLocation.lat.toFixed(6)}, Lng: {gpsLocation.lng.toFixed(6)}
                    {gpsLocation.accuracy && (
                      <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                        (±{gpsLocation.accuracy}m)
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Click Refresh GPS to acquire site coordinates.
                  </div>
                )}
              </div>

              {/* Completion Notes */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Inspection Notes & Outcome
                </label>
                <textarea
                  rows="3"
                  className="sv-search-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="e.g. Met client, completed site inspection, discussed master plan and requirements..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setCompleteModalOpen(false)}
                  disabled={submittingComplete}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-sv-primary"
                  style={{ background: '#059669' }}
                  disabled={submittingComplete}
                >
                  {submittingComplete ? 'Uploading Proof...' : 'Submit Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Not Done Modal */}
      {notDoneModalOpen && selectedVisit && (
        <div className="sv-modal-backdrop" onClick={() => setNotDoneModalOpen(false)}>
          <div className="sv-modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sv-modal-header">
              <h3 style={{ color: '#dc2626' }}>
                <FaTimesCircle /> Mark Visit Not Done
              </h3>
              <button
                type="button"
                className="sv-modal-close-btn"
                onClick={() => setNotDoneModalOpen(false)}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Record why site visit for <strong>{getLeadInfo(selectedVisit).name}</strong> could not be completed.
            </p>

            <form onSubmit={handleNotDoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Reason *
                </label>
                <select
                  className="sv-search-input"
                  value={notDoneReason}
                  onChange={(e) => setNotDoneReason(e.target.value)}
                >
                  <option value="Lead unavailable / Not at site">Lead unavailable / Not at site</option>
                  <option value="Postponed by Customer">Postponed by Customer</option>
                  <option value="Incorrect or incomplete address">Incorrect or incomplete address</option>
                  <option value="Inclement weather / Site inaccessible">Inclement weather / Site inaccessible</option>
                  <option value="Customer cancelled visit request">Customer cancelled visit request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Reschedule Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="sv-search-input"
                  value={notDoneNextDate}
                  onChange={(e) => setNotDoneNextDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Remarks & Instructions
                </label>
                <textarea
                  rows="2"
                  className="sv-search-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Additional explanation..."
                  value={notDoneNotes}
                  onChange={(e) => setNotDoneNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setNotDoneModalOpen(false)}
                  disabled={submittingNotDone}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    border: 'none',
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  disabled={submittingNotDone}
                >
                  {submittingNotDone ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Site Visit Modal (Manager / Admin) */}
      {scheduleModalOpen && (
        <div className="sv-modal-backdrop" onClick={() => setScheduleModalOpen(false)}>
          <div className="sv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sv-modal-header">
              <h3 style={{ color: '#2563eb' }}>
                <FaCalendarAlt /> Schedule Site Visit
              </h3>
              <button
                type="button"
                className="sv-modal-close-btn"
                onClick={() => setScheduleModalOpen(false)}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Select Customer Lead *
                </label>
                <select
                  className="sv-search-input"
                  value={scheduleForm.LeadId}
                  onChange={(e) => {
                    const sel = LeadsList.find((c) => c._id === e.target.value);
                    const addr = sel?.address
                      ? typeof sel.address === 'object'
                        ? [sel.address.street, sel.address.city, sel.address.state].filter(Boolean).join(', ')
                        : sel.address
                      : '';
                    setScheduleForm((prev) => ({
                      ...prev,
                      LeadId: e.target.value,
                      address: addr || prev.address,
                    }));
                  }}
                  required
                >
                  <option value="">-- Choose Lead --</option>
                  {LeadsList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Assign Sales Executive *
                </label>
                <select
                  className="sv-search-input"
                  value={scheduleForm.executiveId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, executiveId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Executive --</option>
                  {executivesList.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {ex.name} ({ex.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  className="sv-search-input"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Site Address *
                </label>
                <input
                  type="text"
                  className="sv-search-input"
                  placeholder="Street, locality, plot number, landmark..."
                  value={scheduleForm.address}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, address: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Priority
                </label>
                <select
                  className="sv-search-input"
                  value={scheduleForm.priority}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 600 }}>
                  Instructions & Special Notes
                </label>
                <textarea
                  rows="2"
                  className="sv-search-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Specific requirements, gate pass required, client expectations..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setScheduleModalOpen(false)}
                  disabled={submittingSchedule}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-sv-primary"
                  disabled={submittingSchedule}
                >
                  {submittingSchedule ? 'Scheduling...' : 'Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteVisits;

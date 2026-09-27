import React, { useState, useEffect, useCallback, useRef } from 'react';
import siteVisitService from '../services/siteVisitService';
import clientService from '../services/clientService';
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
} from 'react-icons/fa';

const SiteVisits = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PLANNED'); // 'PLANNED' | 'DONE' | 'NOT_DONE' | 'ALL'

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
  const [notDoneReason, setNotDoneReason] = useState('Client unavailable / Not at site');
  const [notDoneNextDate, setNotDoneNextDate] = useState('');
  const [notDoneNotes, setNotDoneNotes] = useState('');
  const [submittingNotDone, setSubmittingNotDone] = useState(false);

  // Schedule visit form state
  const [clientsList, setClientsList] = useState([]);
  const [executivesList, setExecutivesList] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    clientId: '',
    executiveId: '',
    scheduledAt: '',
    address: '',
    priority: 'MEDIUM',
    notes: '',
  });
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const isSalesExec = user?.role === 'sales executer' || user?.role === 'user';
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const loadVisits = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      let res;
      if (isSalesExec && user?.role !== 'admin') {
        res = await siteVisitService.getMyVisits(params);
      } else {
        res = await siteVisitService.getAllSiteVisits(params);
      }
      if (res.success) {
        setVisits(res.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load site visits');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isSalesExec, user?.role]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // Load clients and sales execs for scheduling modal
  const openScheduleModal = async () => {
    setScheduleModalOpen(true);
    try {
      const [clientsRes, usersRes] = await Promise.all([
        clientService.getClients({ limit: 100 }),
        userService.getUsers({ limit: 100 }),
      ]);
      setClientsList(clientsRes.data?.data || []);
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
      loadVisits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete visit');
    } finally {
      setSubmittingComplete(false);
    }
  };

  const openNotDoneModal = (visit) => {
    setSelectedVisit(visit);
    setNotDoneReason('Client unavailable / Not at site');
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
      loadVisits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update visit');
    } finally {
      setSubmittingNotDone(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleForm.clientId || !scheduleForm.executiveId || !scheduleForm.scheduledAt || !scheduleForm.address) {
      toast.warning('Please fill in all required fields.');
      return;
    }
    try {
      setSubmittingSchedule(true);
      const res = await siteVisitService.createSiteVisit(scheduleForm);
      toast.success(res.message || 'Site visit scheduled!');
      setScheduleModalOpen(false);
      setScheduleForm({
        clientId: '',
        executiveId: '',
        scheduledAt: '',
        address: '',
        priority: 'MEDIUM',
        notes: '',
      });
      loadVisits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule visit');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">High Priority</span>;
      case 'LOW':
        return <span className="badge bg-secondary-subtle text-secondary border">Low Priority</span>;
      case 'MEDIUM':
      default:
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Medium Priority</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill">
            <FaCheckCircle className="me-1" /> Visit Done
          </span>
        );
      case 'NOT_DONE':
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill">
            <FaTimesCircle className="me-1" /> Not Done
          </span>
        );
      case 'PLANNED':
      default:
        return (
          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1 rounded-pill">
            <FaClock className="me-1" /> Scheduled
          </span>
        );
    }
  };

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="h4 fw-bold mb-1 d-flex align-items-center gap-2">
            <FaCompass className="text-primary" /> Site Visits & Geotagged Proof
          </h2>
          <p className="text-muted mb-0 small">
            {isSalesExec && user?.role !== 'admin'
              ? 'Your assigned site visits. Upload live camera photo and GPS coordinates to verify completion.'
              : 'Track, assign, and review customer site visits with live GPS proof photos.'}
          </p>
        </div>

        <div className="d-flex gap-2">
          {isManagerOrAdmin && (
            <button className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" onClick={openScheduleModal}>
              <FaPlus /> Schedule Site Visit
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2 border-bottom pb-3">
        <div className="btn-group btn-group-sm shadow-sm">
          <button
            className={`btn ${statusFilter === 'PLANNED' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setStatusFilter('PLANNED')}
          >
            Planned / Upcoming
          </button>
          <button
            className={`btn ${statusFilter === 'DONE' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setStatusFilter('DONE')}
          >
            Completed
          </button>
          <button
            className={`btn ${statusFilter === 'NOT_DONE' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setStatusFilter('NOT_DONE')}
          >
            Not Done / Rescheduled
          </button>
          <button
            className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Visits
          </button>
        </div>
        <span className="text-muted small">Showing {visits.length} site visits</span>
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
          Loading site visits...
        </div>
      ) : visits.length === 0 ? (
        <div className="card shadow-sm border-0 text-center py-5">
          <div className="card-body">
            <FaCompass size={40} className="text-muted opacity-50 mb-3" />
            <h5 className="fw-bold">No site visits found</h5>
            <p className="text-muted small">No records match the current filter ({statusFilter.toLowerCase()}).</p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {visits.map((v) => (
            <div key={v._id} className="col-12 col-lg-6 col-xl-4">
              <div className="card shadow-sm border-0 h-100 position-relative">
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                      <FaBuilding className="text-secondary" /> {v.client?.name || 'Client Lead'}
                    </h6>
                    <small className="text-muted">{v.client?.company}</small>
                  </div>
                  <div className="text-end">
                    {getStatusBadge(v.status)}
                    <div className="mt-1">{getPriorityBadge(v.priority)}</div>
                  </div>
                </div>

                <div className="card-body p-3">
                  {/* Scheduled Date */}
                  <div className="d-flex align-items-center gap-2 text-secondary mb-2 small">
                    <FaCalendarAlt className="text-primary" />
                    <strong>Scheduled:</strong>
                    <span>{new Date(v.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>

                  {/* Address */}
                  <div className="d-flex align-items-start gap-2 text-secondary mb-3 small">
                    <FaMapMarkerAlt className="text-danger mt-1 flex-shrink-0" />
                    <div>
                      <div>{v.address}</div>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(v.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-decoration-none small text-primary d-inline-flex align-items-center gap-1 mt-1"
                      >
                        Open in Google Maps →
                      </a>
                    </div>
                  </div>

                  {/* Phone & Contact */}
                  {v.client?.phone && (
                    <div className="d-flex align-items-center gap-2 text-secondary mb-2 small">
                      <FaPhoneAlt className="text-success" />
                      <span>{v.client.phone}</span>
                    </div>
                  )}

                  {/* Assigned Exec */}
                  <div className="border-top pt-2 mt-2 small text-muted d-flex justify-content-between">
                    <span>Assigned Rep:</span>
                    <strong className="text-dark">{v.assignedTo?.name || 'Unassigned'}</strong>
                  </div>

                  {/* Completed Proof Section */}
                  {v.status === 'DONE' && (
                    <div className="mt-3 p-2 bg-success-subtle rounded-3 border border-success-subtle small">
                      <div className="fw-bold text-success d-flex align-items-center gap-1 mb-1">
                        <FaCheckCircle /> Verified Proof of Visit
                      </div>
                      <div className="text-muted">
                        Completed: {new Date(v.completedAt).toLocaleString()}
                      </div>
                      {v.completionNotes && <div className="text-dark mt-1"><em>"{v.completionNotes}"</em></div>}

                      {/* Display Proof Photos */}
                      {v.media && v.media.length > 0 && (
                        <div className="mt-2 d-flex gap-2 flex-wrap">
                          {v.media.map((m) => (
                            <div key={m._id} className="position-relative">
                              <a href={m.url} target="_blank" rel="noreferrer">
                                <img
                                  src={m.url}
                                  alt="Visit Proof"
                                  className="rounded border shadow-sm"
                                  style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                                />
                              </a>
                              {m.latitude && (
                                <div className="badge bg-dark bg-opacity-75 position-absolute bottom-0 start-0 m-1" style={{ fontSize: '9px' }}>
                                  GPS 📍
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Not Done Section */}
                  {v.status === 'NOT_DONE' && (
                    <div className="mt-3 p-2 bg-danger-subtle rounded-3 border border-danger-subtle small">
                      <div className="fw-bold text-danger d-flex align-items-center gap-1 mb-1">
                        <FaTimesCircle /> Reason Not Done:
                      </div>
                      <div className="text-dark">{v.notDoneReason}</div>
                      {v.notDoneNextDate && (
                        <div className="text-muted mt-1">
                          Rescheduled to: <strong>{new Date(v.notDoneNextDate).toLocaleDateString()}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions for Planned Visits */}
                {v.status === 'PLANNED' && (
                  <div className="card-footer bg-white border-top p-2 d-flex gap-2">
                    <button
                      className="btn btn-success btn-sm flex-fill d-flex align-items-center justify-content-center gap-1 fw-semibold"
                      onClick={() => openCompleteModal(v)}
                    >
                      <FaCamera /> Complete with Proof
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => openNotDoneModal(v)}
                      title="Mark as not done / reschedule"
                    >
                      Not Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete Visit Modal */}
      {completeModalOpen && selectedVisit && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1060 }}
          onClick={() => setCompleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-3 shadow p-4"
            style={{ maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h5 className="fw-bold mb-0 text-success d-flex align-items-center gap-2">
                <FaCamera /> Complete Visit Verification
              </h5>
              <button className="btn btn-sm btn-close" onClick={() => setCompleteModalOpen(false)} />
            </div>

            <p className="small text-muted mb-3">
              Site visit for <strong>{selectedVisit.client?.name}</strong> at <em>{selectedVisit.address}</em>.
            </p>

            <form onSubmit={handleCompleteSubmit}>
              {/* Camera Photo Upload */}
              <div className="mb-3 text-center p-3 border rounded-3 bg-light">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="d-none"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                />

                {photoPreview ? (
                  <div className="position-relative d-inline-block">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="rounded shadow-sm img-fluid"
                      style={{ maxHeight: '200px' }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-dark position-absolute top-0 end-0 m-1"
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
                    <FaRegImage size={40} className="text-secondary mb-2 opacity-50" />
                    <p className="small text-muted mb-2">Live camera photo of the site is required</p>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <FaCamera /> Take Photo / Capture Site
                    </button>
                  </div>
                )}
              </div>

              {/* GPS Geotagging Card */}
              <div className="mb-3 p-3 border rounded-3 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-bold d-flex align-items-center gap-1 text-secondary">
                    <FaCrosshairs className="text-danger" /> GPS Coordinates
                  </span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none small"
                    onClick={fetchGps}
                    disabled={gpsLocation.fetching}
                  >
                    {gpsLocation.fetching ? 'Acquiring...' : 'Refresh GPS'}
                  </button>
                </div>

                {gpsLocation.fetching ? (
                  <div className="small text-muted">
                    <div className="spinner-border spinner-border-sm text-secondary me-1" role="status" />
                    Fetching high-accuracy GPS coordinates...
                  </div>
                ) : gpsLocation.error ? (
                  <div className="small text-danger d-flex align-items-center gap-1">
                    <FaExclamationTriangle /> {gpsLocation.error}
                  </div>
                ) : gpsLocation.lat ? (
                  <div className="small text-success">
                    <FaCheckCircle className="me-1" />
                    <strong>Lat:</strong> {gpsLocation.lat.toFixed(6)}, <strong>Lng:</strong> {gpsLocation.lng.toFixed(6)}
                    {gpsLocation.accuracy && (
                      <span className="text-muted ms-2">(Accuracy: ±{gpsLocation.accuracy}m)</span>
                    )}
                  </div>
                ) : (
                  <div className="small text-muted">Click Refresh GPS to acquire location.</div>
                )}
              </div>

              {/* Completion Notes */}
              <div className="mb-3">
                <label className="form-label small fw-semibold">Visit Outcome & Notes</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="e.g. Met client, inspected site, discussed floor plan, client requested quotation..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setCompleteModalOpen(false)}
                  disabled={submittingComplete}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-success" disabled={submittingComplete}>
                  {submittingComplete ? 'Uploading & Verifying...' : 'Submit Visit Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Not Done Modal */}
      {notDoneModalOpen && selectedVisit && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          onClick={() => setNotDoneModalOpen(false)}
        >
          <div
            className="bg-white rounded-3 shadow p-4"
            style={{ maxWidth: '460px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="fw-bold mb-2 text-danger d-flex align-items-center gap-2">
              <FaTimesCircle /> Mark Visit Not Done
            </h5>
            <p className="small text-muted mb-3">
              Record why the site visit for <strong>{selectedVisit.client?.name}</strong> could not be completed.
            </p>

            <form onSubmit={handleNotDoneSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Reason *</label>
                <select
                  className="form-select form-select-sm"
                  value={notDoneReason}
                  onChange={(e) => setNotDoneReason(e.target.value)}
                >
                  <option value="Client unavailable / Not at site">Client unavailable / Not at site</option>
                  <option value="Postponed by client">Postponed by client</option>
                  <option value="Incorrect or incomplete address">Incorrect or incomplete address</option>
                  <option value="Inclement weather / Site inaccessible">Inclement weather / Site inaccessible</option>
                  <option value="Client cancelled request">Client cancelled request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Reschedule Date (Optional)</label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={notDoneNextDate}
                  onChange={(e) => setNotDoneNextDate(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Remarks</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  placeholder="Additional context or notes..."
                  value={notDoneNotes}
                  onChange={(e) => setNotDoneNotes(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setNotDoneModalOpen(false)}
                  disabled={submittingNotDone}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-danger" disabled={submittingNotDone}>
                  {submittingNotDone ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Site Visit Modal (Manager / Admin) */}
      {scheduleModalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          onClick={() => setScheduleModalOpen(false)}
        >
          <div
            className="bg-white rounded-3 shadow p-4"
            style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h5 className="fw-bold mb-0 text-primary d-flex align-items-center gap-2">
                <FaCalendarAlt /> Schedule Site Visit
              </h5>
              <button className="btn btn-sm btn-close" onClick={() => setScheduleModalOpen(false)} />
            </div>

            <form onSubmit={handleScheduleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Select Client / Lead *</label>
                <select
                  className="form-select form-select-sm"
                  value={scheduleForm.clientId}
                  onChange={(e) => {
                    const sel = clientsList.find((c) => c._id === e.target.value);
                    const addr = sel?.address
                      ? [sel.address.street, sel.address.city, sel.address.state].filter(Boolean).join(', ')
                      : '';
                    setScheduleForm((prev) => ({
                      ...prev,
                      clientId: e.target.value,
                      address: addr || prev.address,
                    }));
                  }}
                  required
                >
                  <option value="">-- Choose Lead --</option>
                  {clientsList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Assign Sales Executive *</label>
                <select
                  className="form-select form-select-sm"
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

              <div className="mb-3">
                <label className="form-label small fw-semibold">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Site Address *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Full street address of site..."
                  value={scheduleForm.address}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, address: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Priority</label>
                <select
                  className="form-select form-select-sm"
                  value={scheduleForm.priority}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Instructions / Notes</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  placeholder="Gate pass needed, meet manager at site..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setScheduleModalOpen(false)}
                  disabled={submittingSchedule}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={submittingSchedule}>
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

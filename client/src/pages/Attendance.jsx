import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../services/attendanceService';
import { toast } from 'react-toastify';
import {
  FaClock,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaCalendarAlt,
  FaSignInAlt,
  FaSignOutAlt,
  FaStickyNote,
} from 'react-icons/fa';

const Attendance = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time digital clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getMyAttendance();
      if (res.success) {
        setTodayRecord(res.today);
        setHistory(res.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);
      const res = await attendanceService.checkIn(notes);
      toast.success(res.message || 'Check-in recorded!');
      setTodayRecord(res.data);
      setNotes('');
      loadAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm('Are you sure you want to punch out for today?')) return;
    try {
      setSubmitting(true);
      const res = await attendanceService.checkOut();
      toast.success(res.message || 'Check-out recorded!');
      setTodayRecord(res.data);
      loadAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1">
            <FaCheckCircle /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1">
            <FaTimesCircle /> Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1">
            <FaHourglassHalf /> Pending Approval
          </span>
        );
    }
  };

  const approvedCount = history.filter((r) => r.status === 'APPROVED').length;
  const pendingCount = history.filter((r) => r.status === 'PENDING').length;
  const totalHours = history.reduce((sum, r) => sum + (r.hoursWorked || 0), 0).toFixed(1);

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1">Daily Attendance</h2>
          <p className="text-muted mb-0 small">Mark your daily check-in and check-out, and track manager approval status.</p>
        </div>
        <div className="text-end d-none d-sm-block">
          <div className="fw-semibold text-secondary small">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
          <div className="fs-5 fw-bold font-monospace text-primary">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Main Row: Check-in Card + Stats */}
      <div className="row g-4 mb-4">
        {/* Punch In/Out Card */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="card-title mb-0 fs-6 fw-bold d-flex align-items-center gap-2">
                <FaClock className="text-primary" /> Today's Punch Card
              </h5>
            </div>
            <div className="card-body p-4 text-center">
              <div className="mb-4">
                <span className="text-muted small text-uppercase fw-semibold tracking-wider">Current Status</span>
                <div className="mt-2">
                  {todayRecord ? (
                    getStatusBadge(todayRecord.status)
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary px-3 py-2 rounded-pill">
                      Not Checked In Yet
                    </span>
                  )}
                </div>
              </div>

              {/* Times Grid */}
              <div className="row g-2 p-3 bg-light rounded-3 mb-4 text-start">
                <div className="col-6 border-end">
                  <div className="text-muted small">Punch In</div>
                  <div className="fw-bold text-dark">
                    {todayRecord?.checkInTime
                      ? new Date(todayRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--'}
                  </div>
                </div>
                <div className="col-6 ps-3">
                  <div className="text-muted small">Punch Out</div>
                  <div className="fw-bold text-dark">
                    {todayRecord?.checkOutTime
                      ? new Date(todayRecord.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!todayRecord ? (
                <div>
                  <div className="mb-3 text-start">
                    <label className="form-label small text-muted d-flex align-items-center gap-1">
                      <FaStickyNote /> Check-in Notes (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Working from site / office..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    onClick={handleCheckIn}
                    disabled={submitting}
                  >
                    <FaSignInAlt /> {submitting ? 'Recording...' : 'Punch In Now'}
                  </button>
                </div>
              ) : !todayRecord.checkOutTime ? (
                <div>
                  <div className="alert alert-info py-2 small mb-3">
                    You checked in at{' '}
                    <strong>
                      {new Date(todayRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                    . Don't forget to punch out when your shift ends.
                  </div>
                  <button
                    className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    onClick={handleCheckOut}
                    disabled={submitting}
                  >
                    <FaSignOutAlt /> {submitting ? 'Recording...' : 'Punch Out Now'}
                  </button>
                </div>
              ) : (
                <div className="alert alert-success py-3 mb-0">
                  <h6 className="fw-bold mb-1">Shift Completed Today!</h6>
                  <p className="mb-0 small text-muted">
                    Total Hours Logged: <strong>{todayRecord.hoursWorked || 0} hrs</strong>
                  </p>
                  {todayRecord.managerRemarks && (
                    <div className="mt-2 text-start small border-top pt-2">
                      <strong>Manager Remark:</strong> {todayRecord.managerRemarks}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="col-12 col-lg-7">
          <div className="row g-3 h-100">
            <div className="col-sm-6">
              <div className="card shadow-sm border-0 h-100 p-3 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-semibold">Days Logged</span>
                  <span className="p-2 rounded-circle bg-primary-subtle text-primary">
                    <FaCalendarAlt size={16} />
                  </span>
                </div>
                <h3 className="fw-bold mb-1">{history.length}</h3>
                <small className="text-muted">Total attendance entries</small>
              </div>
            </div>

            <div className="col-sm-6">
              <div className="card shadow-sm border-0 h-100 p-3 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-semibold">Approved Days</span>
                  <span className="p-2 rounded-circle bg-success-subtle text-success">
                    <FaCheckCircle size={16} />
                  </span>
                </div>
                <h3 className="fw-bold mb-1 text-success">{approvedCount}</h3>
                <small className="text-muted">Verified by manager</small>
              </div>
            </div>

            <div className="col-sm-6">
              <div className="card shadow-sm border-0 h-100 p-3 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-semibold">Pending Approval</span>
                  <span className="p-2 rounded-circle bg-warning-subtle text-warning">
                    <FaHourglassHalf size={16} />
                  </span>
                </div>
                <h3 className="fw-bold mb-1 text-warning">{pendingCount}</h3>
                <small className="text-muted">Awaiting review</small>
              </div>
            </div>

            <div className="col-sm-6">
              <div className="card shadow-sm border-0 h-100 p-3 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted small fw-semibold">Total Hours</span>
                  <span className="p-2 rounded-circle bg-info-subtle text-info">
                    <FaClock size={16} />
                  </span>
                </div>
                <h3 className="fw-bold mb-1 text-info">{totalHours} hrs</h3>
                <small className="text-muted">Logged working time</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fs-6 fw-bold">Attendance History</h5>
          <span className="badge bg-light text-secondary border">{history.length} Records</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="small text-muted text-uppercase">
                <th>Date</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Manager / Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    Loading attendance records...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No attendance records found. Punch in to create your first record!
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record._id}>
                    <td className="fw-semibold">
                      {new Date(record.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      {record.checkInTime
                        ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </td>
                    <td>
                      {record.checkOutTime
                        ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-muted fst-italic">Active</span>}
                    </td>
                    <td>
                      {record.hoursWorked ? `${record.hoursWorked} hrs` : '--'}
                    </td>
                    <td>{getStatusBadge(record.status)}</td>
                    <td>
                      <div className="small">
                        {record.managerRemarks && (
                          <div className="text-secondary">
                            <strong>Remark:</strong> {record.managerRemarks}
                          </div>
                        )}
                        {record.userNotes && (
                          <div className="text-muted">
                            <em>Note: {record.userNotes}</em>
                          </div>
                        )}
                        {!record.managerRemarks && !record.userNotes && (
                          <span className="text-muted">--</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;

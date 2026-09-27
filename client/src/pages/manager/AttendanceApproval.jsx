import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';
import { toast } from 'react-toastify';
import {
  FaCheck,
  FaTimes,
  FaHourglassHalf,
  FaFilter,
  FaUserCheck,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';

const AttendanceApproval = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [pendingList, setPendingList] = useState([]);
  const [allList, setAllList] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reject modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'pending') {
        const res = await attendanceService.getPendingAttendance();
        if (res.success) setPendingList(res.data || []);
      } else {
        const res = await attendanceService.getTeamAttendance(filterDate ? { date: filterDate } : {});
        if (res.success) setAllList(res.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id) => {
    try {
      setActionLoading(true);
      const res = await attendanceService.approveAttendance(id);
      toast.success(res.message || 'Attendance approved successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.warning('Please provide a reason for rejection.');
      return;
    }
    try {
      setActionLoading(true);
      const res = await attendanceService.rejectAttendance(selectedRecord._id, rejectReason);
      toast.info(res.message || 'Attendance marked as rejected');
      setSelectedRecord(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill">
            <FaCheckCircle className="me-1" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill">
            <FaTimesCircle className="me-1" /> Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 rounded-pill">
            <FaHourglassHalf className="me-1" /> Pending
          </span>
        );
    }
  };

  const listToDisplay = activeTab === 'pending' ? pendingList : allList;
  const filteredList = listToDisplay.filter((rec) => {
    if (!searchQuery) return true;
    const name = rec.user?.name?.toLowerCase() || '';
    const email = rec.user?.email?.toLowerCase() || '';
    const dept = rec.user?.department?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q) || dept.includes(q);
  });

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="h4 fw-bold mb-1 d-flex align-items-center gap-2">
            <FaUserCheck className="text-primary" /> Team Attendance Approvals
          </h2>
          <p className="text-muted mb-0 small">
            Review and approve daily check-ins and working hours logged by your team.
          </p>
        </div>

        {/* Tab switch */}
        <div className="btn-group shadow-sm">
          <button
            className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Requests ({pendingList.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('all')}
          >
            All Team Records
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">
                <FaSearch className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by employee name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {activeTab === 'all' && (
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light">
                  <FaFilter className="text-muted" />
                </span>
                <input
                  type="date"
                  className="form-control"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
                {filterDate && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setFilterDate('')}
                    title="Clear Date"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="small text-muted text-uppercase">
                <th>Employee</th>
                <th>Role / Dept</th>
                <th>Date</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Hours</th>
                <th>Status</th>
                <th className="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    Loading attendance data...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    {activeTab === 'pending'
                      ? 'No pending attendance requests right now! 🎉'
                      : 'No attendance records found.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((rec) => (
                  <tr key={rec._id}>
                    <td>
                      <div className="fw-semibold text-dark">{rec.user?.name || 'Unknown'}</div>
                      <div className="text-muted small">{rec.user?.email}</div>
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary text-capitalize me-1">
                        {rec.user?.role || '--'}
                      </span>
                      <small className="text-muted text-capitalize">{rec.user?.department}</small>
                    </td>
                    <td className="fw-medium text-secondary">
                      {new Date(rec.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      {rec.checkInTime
                        ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </td>
                    <td>
                      {rec.checkOutTime
                        ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-muted fst-italic">Active</span>}
                    </td>
                    <td className="fw-bold">{rec.hoursWorked ? `${rec.hoursWorked} hrs` : '--'}</td>
                    <td>{getStatusBadge(rec.status)}</td>
                    <td className="text-end pe-3">
                      {rec.status === 'PENDING' ? (
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-success"
                            onClick={() => handleApprove(rec._id)}
                            disabled={actionLoading}
                            title="Approve Attendance"
                          >
                            <FaCheck className="me-1" /> Approve
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => setSelectedRecord(rec)}
                            disabled={actionLoading}
                            title="Reject Attendance"
                          >
                            <FaTimes className="me-1" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted small">
                          {rec.managerRemarks ? `Note: ${rec.managerRemarks}` : 'Done'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {selectedRecord && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white rounded-3 shadow p-4"
            style={{ maxWidth: '460px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="fw-bold mb-2 text-danger d-flex align-items-center gap-2">
              <FaTimesCircle /> Reject Attendance
            </h5>
            <p className="text-muted small mb-3">
              Rejecting attendance for <strong>{selectedRecord.user?.name}</strong> on {selectedRecord.date}.
              Please provide a clear reason.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Reason for Rejection *</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="e.g. Unapproved absence, early departure without notification..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedRecord(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-danger" disabled={actionLoading}>
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceApproval;

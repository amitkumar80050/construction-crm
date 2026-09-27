import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import managerService from '../../services/managerService';
import { toast } from 'react-toastify';
import {
  FaUsers,
  FaCheckCircle,
  FaCompass,
  FaPhoneAlt,
  FaHourglassHalf,
  FaUserCheck,
  FaRandom,
  FaArrowRight,
  FaFilter,
  FaBuilding,
  FaCalendarCheck,
} from 'react-icons/fa';

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await managerService.getManagerDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load team dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
        Loading team analytics and KPIs...
      </div>
    );
  }

  const { totalLeads, stageFunnel, siteVisits, attendance, activity, teamMembers, managedTeams } = data || {};

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="h4 fw-bold mb-1 d-flex align-items-center gap-2">
            <FaUsers className="text-primary" /> Manager Team Dashboard
          </h2>
          <p className="text-muted mb-0 small">
            Oversee team performance, pipeline conversions, site visits, and daily attendance.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="d-flex flex-wrap gap-2">
          <Link to="/manager/attendance" className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1">
            <FaUserCheck /> Approve Attendance ({attendance?.pendingApprovals || 0})
          </Link>
          <Link to="/site-visits" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
            <FaCompass /> Site Visits ({siteVisits?.scheduled || 0})
          </Link>
          <Link to="/clients" className="btn btn-primary btn-sm d-flex align-items-center gap-1">
            <FaRandom /> Team Leads ({totalLeads || 0})
          </Link>
        </div>
      </div>

      {/* Managed Teams Badges */}
      {managedTeams && managedTeams.length > 0 && (
        <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
          <span className="small text-muted fw-semibold">Managed Teams:</span>
          {managedTeams.map((t) => (
            <span key={t._id} className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill">
              🏢 {t.name} ({t.code})
            </span>
          ))}
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Total Leads */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">Team Leads</span>
              <span className="p-2 rounded-circle bg-primary-subtle text-primary">
                <FaBuilding size={16} />
              </span>
            </div>
            <h3 className="fw-bold mb-1">{totalLeads || 0}</h3>
            <div className="small text-muted">Active pipeline leads</div>
          </div>
        </div>

        {/* Site Visits */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">Site Visits</span>
              <span className="p-2 rounded-circle bg-success-subtle text-success">
                <FaCompass size={16} />
              </span>
            </div>
            <div className="d-flex align-items-baseline gap-2 mb-1">
              <h3 className="fw-bold mb-0 text-success">{siteVisits?.completed || 0}</h3>
              <span className="text-muted small">/ {siteVisits?.total || 0} Done</span>
            </div>
            <div className="small text-muted">{siteVisits?.scheduled || 0} upcoming / planned</div>
          </div>
        </div>

        {/* Attendance Today */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">Attendance Today</span>
              <span className="p-2 rounded-circle bg-warning-subtle text-warning">
                <FaCalendarCheck size={16} />
              </span>
            </div>
            <div className="d-flex align-items-baseline gap-2 mb-1">
              <h3 className="fw-bold mb-0 text-dark">{attendance?.presentToday || 0}</h3>
              <span className="text-muted small">/ {attendance?.totalMembers || 0} Present</span>
            </div>
            <div className="small text-warning-emphasis fw-medium">
              {attendance?.pendingApprovals || 0} approvals pending
            </div>
          </div>
        </div>

        {/* Calls / Activity */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100 p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">Calls Logged Today</span>
              <span className="p-2 rounded-circle bg-info-subtle text-info">
                <FaPhoneAlt size={16} />
              </span>
            </div>
            <h3 className="fw-bold mb-1 text-info">{activity?.callsToday || 0}</h3>
            <div className="small text-muted">Customer interaction remarks</div>
          </div>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fs-6 fw-bold d-flex align-items-center gap-2">
            <FaFilter className="text-primary" /> Sales Pipeline Stage Funnel
          </h5>
          <span className="badge bg-light text-secondary border">Total: {totalLeads || 0} Leads</span>
        </div>
        <div className="card-body p-4">
          <div className="row g-3">
            {stageFunnel &&
              stageFunnel.map((stage) => {
                const percentage = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
                return (
                  <div key={stage.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
                    <div
                      className="p-3 rounded-3 border h-100 position-relative"
                      style={{
                        background: '#fafafa',
                        borderLeft: `5px solid ${stage.color || '#3b82f6'}`,
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong className="text-dark small">{stage.name}</strong>
                        <span className="badge bg-white text-dark shadow-sm border">{stage.count}</span>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: stage.color || '#3b82f6',
                          }}
                        />
                      </div>
                      <small className="text-muted d-block mt-1 text-end" style={{ fontSize: '11px' }}>
                        {percentage}% of leads
                      </small>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Team Roster Table */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fs-6 fw-bold d-flex align-items-center gap-2">
            <FaUsers className="text-secondary" /> Active Team Members
          </h5>
          <Link to="/my-team" className="btn btn-sm btn-link text-decoration-none">
            Manage Team Workspace →
          </Link>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-muted text-uppercase">
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers && teamMembers.length > 0 ? (
                teamMembers.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <div className="fw-semibold text-dark">{m.name}</div>
                      <small className="text-muted">{m.email}</small>
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary text-capitalize">
                        {m.role}
                      </span>
                    </td>
                    <td className="text-capitalize text-muted small">{m.department || 'Operations'}</td>
                    <td>
                      <Link to="/clients" className="btn btn-outline-secondary btn-sm" title="View Leads">
                        View Leads
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted">
                    No team members found under your management.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;

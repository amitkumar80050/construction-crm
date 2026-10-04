import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import activityLogService from '../../services/activityLogService';
import { useAuth } from '../../hooks/useAuth';
import { FaHistory, FaCalendarAlt, FaUser, FaTag, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const MyLogs = () => {
  const { user } = useAuth();
  const isAuditor = user?.role === 'auditor';
  const isAdmin = user?.role === 'admin';

  const [viewScope, setViewScope] = useState(isAuditor ? 'all' : 'my'); // 'my' | 'all'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      if (isAuditor || viewScope === 'all') {
        res = await activityLogService.getAllLogs({ page, limit: 25 });
      } else {
        res = await activityLogService.getMyLogs({ page, limit: 25 });
      }
      setLogs(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [page, viewScope, isAuditor]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getModuleBadgeColor = (module) => {
    switch (module) {
      case 'client':
        return 'bg-primary-subtle text-primary border border-primary-subtle';
      case 'stage':
        return 'bg-purple-subtle text-purple border border-purple-subtle';
      case 'attendance':
        return 'bg-warning-subtle text-warning border border-warning-subtle';
      case 'site_visit':
        return 'bg-success-subtle text-success border border-success-subtle';
      case 'remark':
        return 'bg-info-subtle text-info border border-info-subtle';
      default:
        return 'bg-secondary-subtle text-secondary border';
    }
  };

  const totalPages = Math.ceil(total / 25) || 1;

  return (
    <div className="container-fluid py-4 px-md-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="h4 fw-bold mb-1 d-flex align-items-center gap-2">
            <FaHistory className="text-primary" /> {isAuditor ? 'Organization Audit Logs' : viewScope === 'all' ? 'System Audit Trail' : 'My Activity Logs'}
          </h2>
          <p className="text-muted mb-0 small">
            {isAuditor
              ? 'Read-only organization-wide compliance and activity audit trail.'
              : 'Audit history of actions, stage updates, calls, and customer interactions.'}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {isAdmin && (
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${viewScope === 'my' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => { setViewScope('my'); setPage(1); }}
              >
                My Logs
              </button>
              <button
                type="button"
                className={`btn ${viewScope === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => { setViewScope('all'); setPage(1); }}
              >
                All System Logs
              </button>
            </div>
          )}
          <span className="badge bg-light text-secondary border">{total} Total Activities</span>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-muted text-uppercase">
              <tr>
                <th>Date & Time</th>
                {(isAuditor || viewScope === 'all') && <th>User</th>}
                <th>Module</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={(isAuditor || viewScope === 'all') ? 5 : 4} className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                    Loading activity history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={(isAuditor || viewScope === 'all') ? 5 : 4} className="text-center py-5 text-muted">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td className="small text-secondary" style={{ whiteSpace: 'nowrap' }}>
                      <FaCalendarAlt className="me-1 opacity-75" />
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    {(isAuditor || viewScope === 'all') && (
                      <td className="small">
                        <FaUser className="me-1 opacity-50 text-muted" />
                        <strong>{log.userNameSnapshot || log.user?.name || log.user || 'System'}</strong>
                        {log.userIdSnapshot && <span className="text-muted ms-1">({log.userIdSnapshot})</span>}
                      </td>
                    )}
                    <td>
                      <span className={`badge rounded-pill text-capitalize px-2 py-1 ${getModuleBadgeColor(log.module)}`}>
                        {log.module}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border text-uppercase" style={{ fontSize: '10px' }}>
                        {log.type}
                      </span>
                    </td>
                    <td>
                      <div className="text-dark small">{log.description}</div>
                      {log.client && (
                        <small className="text-muted">
                          Client: <strong>{typeof log.client === 'object' ? log.client.name : log.client}</strong>
                        </small>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center py-3">
            <small className="text-muted">
              Page {page} of {totalPages}
            </small>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <FaChevronLeft size={10} className="me-1" /> Prev
              </button>
              <button
                className="btn btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <FaChevronRight size={10} className="ms-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLogs;

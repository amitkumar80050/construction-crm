import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaHistory } from 'react-icons/fa';
import activityLogService from '../../services/activityLogService';

const EmployeeLogDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ module: '', action: '', from: '', to: '', search: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      const res = await activityLogService.getEmployeeLogs(userId, params);
      setEmployee(res.data.employee);
      setLogs(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [userId, page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div style={{ padding: '24px' }}>
      <button
        onClick={() => navigate('/manager/logs/employees')}
        style={{
          padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569',
          marginBottom: '16px'
        }}
      >
        <FaArrowLeft /> Back to Employees
      </button>

      <h1 style={{ fontSize: '24px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FaHistory /> Activity Logs
      </h1>

      {employee && (
        <div style={{
          background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px', margin: '16px 0', display: 'flex', gap: '24px', flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Name</div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{employee.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>User ID</div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{employee.userId}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Department</div>
            <div style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{employee.department}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Role</div>
            <div style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{employee.role}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', margin: '16px 0', flexWrap: 'wrap' }}>
        <input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />
        <input
          type="date"
          value={filters.from}
          onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1); }}
          style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1); }}
          style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No activity found for this employee.</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Date</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Action</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Module</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', color: '#475569' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '10px', textTransform: 'capitalize', color: '#475569' }}>{log.type}</td>
                  <td style={{ padding: '10px', textTransform: 'capitalize', color: '#475569' }}>{log.module}</td>
                  <td style={{ padding: '10px', color: '#1e293b' }}>{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '8px 16px', background: page === 1 ? '#f1f5f9' : 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span style={{ color: '#64748b', fontSize: '13px' }}>Page {page} of {pagination.totalPages}</span>
          <button
            disabled={page === pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '8px 16px', background: page === pagination.totalPages ? '#f1f5f9' : 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeeLogDetails;
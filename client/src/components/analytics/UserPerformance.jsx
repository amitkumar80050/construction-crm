import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaUserTie } from 'react-icons/fa';
import analyticsService from '../../services/analyticsService';

const UserPerformance = () => {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await analyticsService.getUserPerformance();
        setPerformance(res.data?.data || []);
      } catch (error) {
        if (error?.response?.status === 403) {
          setForbidden(true);
        } else {
          toast.error('Failed to load user performance');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading team performance...</p>;
  }

  if (forbidden) {
    return null; // Non-admin users simply don't see this section
  }

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <FaUserTie style={{ color: '#2563eb' }} />
        <h3 style={{ margin: 0, color: '#1e293b' }}>Team Performance</h3>
      </div>

      {performance.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No team performance data available.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>Role</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>Assigned</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>Converted</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>Conv. Rate</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>Remarks</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>Reminders Done</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((p) => (
                <tr key={p.userId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: 500, color: '#1e293b' }}>{p.name}</td>
                  <td style={{ padding: '10px', color: '#64748b', textTransform: 'capitalize' }}>{p.role}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>{p.clientsAssigned}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>{p.leadsConverted}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: '20px', fontSize: '12px',
                      background: '#dcfce7', color: '#22c55e', fontWeight: 600
                    }}>
                      {p.conversionRate}%
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>{p.remarks}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>{p.completedReminders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserPerformance;
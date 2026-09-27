import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import attendanceService from '../../services/attendanceService';

const AttendanceApprovals = () => {
  const [records, setRecords] = useState([]);
  const [remarks, setRemarks] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getPending();
      setRecords(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load pending attendance');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleReview = async (id, decision) => {
    const note = (remarks[id] || '').trim();
    setSavingId(id);
    try {
      if (decision === 'APPROVED') await attendanceService.approve(id, note);
      else await attendanceService.reject(id, note);
      toast.success(`Attendance ${decision.toLowerCase()}`);
      setRecords((items) => items.filter((item) => item._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update attendance');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', color: '#1e293b' }}>Pending Attendance Approvals</h1>
      {loading ? <p>Loading attendance...</p> : records.length === 0 ? <p style={{ color: '#64748b' }}>No pending attendance records.</p> : (
        <div style={{ background: 'white', borderRadius: '8px', marginTop: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f6f4' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Employee</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Department</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Check-in</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Check-out</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Manager note / rejection reason</th>
              <th style={{ padding: '10px' }}>Actions</th>
            </tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px' }}>{r.user?.name || 'Employee'} <small style={{ color: '#94a3b8' }}>({r.user?.userId || 'ID unavailable'})</small></td>
                  <td style={{ padding: '10px', textTransform: 'capitalize' }}>{r.user?.department || '-'}</td>
                  <td style={{ padding: '10px' }}>{r.date}</td>
                  <td style={{ padding: '10px' }}>{r.checkInTime || r.markedAt ? new Date(r.checkInTime || r.markedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '-'}</td>
                  <td style={{ padding: '10px' }}>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not checked out'}</td>
                  <td style={{ padding: '10px' }}><input aria-label={`Optional manager remark for ${r.user?.name || 'employee'}`} value={remarks[r._id] || ''} onChange={(event) => setRemarks({ ...remarks, [r._id]: event.target.value })} placeholder="Optional remark" style={{ width: 230, maxWidth: '100%', padding: 7, border: '1px solid #cbd5d1', borderRadius: 4 }} /></td>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    <button type="button" disabled={savingId === r._id} onClick={() => handleReview(r._id, 'APPROVED')} style={{ padding: '7px 10px', background: '#d9f0e8', color: '#176b55', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                    <button type="button" disabled={savingId === r._id} onClick={() => handleReview(r._id, 'REJECTED')} style={{ padding: '7px 10px', marginLeft: 6, background: '#fce4e4', color: '#a83232', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default AttendanceApprovals;
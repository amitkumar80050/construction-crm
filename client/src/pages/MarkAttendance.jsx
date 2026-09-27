import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaClock } from 'react-icons/fa';
import attendanceService from '../services/attendanceService';

const MarkAttendance = () => {
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [punching, setPunching] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getMy();
      const records = res.data.data;
      const todayStr = new Date().toISOString().slice(0, 10);
      setToday(records.find((r) => r.date === todayStr) || null);
      setHistory(records);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load attendance');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handlePunch = async () => {
    setPunching(true);
    try {
      if (today) {
        await attendanceService.checkOut();
        toast.success('Check-out recorded');
      } else {
        await attendanceService.checkIn();
        toast.success('Check-in recorded');
      }
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to record attendance');
    } finally {
      setPunching(false);
    }
  };

  const statusColor = { PENDING: '#f59e0b', APPROVED: '#22c55e', REJECTED: '#ef4444' };
  const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not recorded';
  const canCheckOut = today?.status === 'PENDING' && !today.checkOutTime;

  return (
    <div style={{ padding: '24px', maxWidth: '480px' }}>
      <h1 style={{ fontSize: '24px', color: '#1e293b' }}>Attendance</h1>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', margin: '20px 0' }}>
        {loading ? <p>Loading attendance...</p> : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{today ? `Attendance for ${today.date}` : 'No check-in recorded today'}</p>
                {today && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: statusColor[today.status] }}><FaCheckCircle />{today.status}</span>}
              </div>
              {(!today || canCheckOut) && <button type="button" onClick={handlePunch} disabled={punching} style={{ padding: '12px 20px', fontSize: '15px', background: '#176b55', color: 'white', border: 'none', borderRadius: '6px', cursor: punching ? 'wait' : 'pointer' }}>
                {punching ? 'Recording...' : today ? 'Check out' : 'Check in'}
              </button>}
            </div>
            {today && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <div><small style={{ color: '#64748b' }}>Check-in</small><div>{formatTime(today.checkInTime || today.markedAt)}</div></div>
              <div><small style={{ color: '#64748b' }}>Check-out</small><div>{formatTime(today.checkOutTime)}</div></div>
              <div><small style={{ color: '#64748b' }}>Manager note</small><div>{today.managerRemarks || today.rejectionReason || 'None'}</div></div>
            </div>}
          </>
        )}
      </div>

      <h3 style={{ fontSize: '15px', color: '#1e293b' }}>Recent History</h3>
      {history.map((r) => (
        <div key={r._id} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) repeat(2, minmax(110px, 1fr)) auto', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
          <span><FaClock size={11} /> {r.date}</span>
          <span>In: {formatTime(r.checkInTime || r.markedAt)}</span>
          <span>Out: {formatTime(r.checkOutTime)}</span>
          <span style={{ color: statusColor[r.status] }}>{r.status}</span>
        </div>
      ))}
    </div>
  );
};
export default MarkAttendance;
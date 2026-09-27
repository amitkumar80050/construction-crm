import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCalendarAlt, FaCamera, FaCheckCircle, FaMapMarkerAlt, FaTimesCircle } from 'react-icons/fa';
import siteVisitService from '../services/siteVisitService';

const SalesExecutiveDashboard = () => {
  const [visits, setVisits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState({ latitude: null, longitude: null, address: '' });
  const [notes, setNotes] = useState('');
  const [notDone, setNotDone] = useState({ reason: '', notes: '', nextScheduledAt: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setVisits((await siteVisitService.getMyVisits()).data?.data || []); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to load your site visits'); }
  };
  useEffect(() => { load(); }, []);

  const openCompletion = (visit) => {
    setSelected(visit); setMode('complete'); setPhoto(null); setNotes('');
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation({ latitude: coords.latitude, longitude: coords.longitude, address: '' }),
      () => setLocation({ latitude: null, longitude: null, address: '' }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const submitComplete = async (event) => {
    event.preventDefault();
    if (!photo) return toast.error('Capture a live photo before completing the visit');
    setSaving(true);
    try { const data = new FormData(); data.append('photo', photo); data.append('notes', notes); data.append('latitude', location.latitude ?? ''); data.append('longitude', location.longitude ?? ''); data.append('address', location.address); await siteVisitService.complete(selected._id, data); toast.success('Visit completed and proof submitted'); setMode(null); setSelected(null); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to complete visit'); }
    finally { setSaving(false); }
  };
  const submitNotDone = async (event) => {
    event.preventDefault();
    if (!notDone.reason || !notDone.notes.trim()) return toast.error('Reason and notes are required');
    setSaving(true);
    try { await siteVisitService.notDone(selected._id, notDone); toast.success('Manager notified about the visit'); setMode(null); setSelected(null); setNotDone({ reason: '', notes: '', nextScheduledAt: '' }); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update visit'); }
    finally { setSaving(false); }
  };

  const planned = visits.filter((visit) => visit.status === 'PLANNED');
  return <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}><header style={{ marginBottom: 24 }}><h1 style={{ margin: 0, color: '#172033' }}>My site visits</h1><p style={{ color: '#64748b' }}>Complete assigned visits with live proof, location, and field notes.</p></header><div style={stats}><div style={stat}><FaCalendarAlt color="#2563eb" /><strong>{planned.length}</strong><span>Upcoming visits</span></div><div style={stat}><FaCheckCircle color="#16a34a" /><strong>{visits.filter((visit) => visit.status === 'DONE').length}</strong><span>Completed</span></div><div style={stat}><FaTimesCircle color="#dc2626" /><strong>{visits.filter((visit) => visit.status === 'MISSED').length}</strong><span>Not done</span></div></div><section style={section}><h2>Assigned visits</h2>{visits.length === 0 ? <p style={{ color: '#64748b' }}>No site visits assigned.</p> : <div style={list}>{visits.map((visit) => <article key={visit._id} style={visitCard}><div><span style={statusStyle(visit.status)}>{visit.status}</span><h3>{visit.lead?.name || 'Lead'}</h3><p>{visit.lead?.company}</p><p><FaCalendarAlt /> {new Date(visit.scheduledAt).toLocaleString()}</p><p><FaMapMarkerAlt /> {visit.address}</p><p style={{ color: '#64748b' }}>{visit.priority} priority · {visit.notes}</p></div>{visit.status === 'PLANNED' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" onClick={() => openCompletion(visit)} style={primary}><FaCamera /> Complete visit</button><button type="button" onClick={() => { setSelected(visit); setMode('notdone'); }} style={secondary}><FaTimesCircle /> Not done</button></div>}</article>)}</div>}</section>{selected && mode === 'complete' && <div style={backdrop}><form onSubmit={submitComplete} style={modal}><div style={modalHeader}><h2>Complete visit</h2><button type="button" onClick={() => setMode(null)} style={close}>Close</button></div><p><b>{selected.lead?.name}</b> · {selected.address}</p><label>Live camera photo<input required type="file" accept="image/*" capture="environment" onChange={(event) => setPhoto(event.target.files?.[0] || null)} style={input} /></label><small style={{ color: '#64748b' }}>Use the camera control on your device. Gallery selection is not offered by this field.</small><label>Location<input readOnly value={location.latitude == null ? 'Location unavailable (permission denied or unsupported)' : `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`} style={input} /></label><label>Notes (optional)<textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} style={input} /></label><button disabled={saving} type="submit" style={primary}>{saving ? 'Submitting...' : 'Submit visit proof'}</button></form></div>}{selected && mode === 'notdone' && <div style={backdrop}><form onSubmit={submitNotDone} style={modal}><div style={modalHeader}><h2>Mark visit not done</h2><button type="button" onClick={() => setMode(null)} style={close}>Close</button></div><label>Reason<select required value={notDone.reason} onChange={(event) => setNotDone({ ...notDone, reason: event.target.value })} style={input}><option value="">Select reason</option><option>Client unavailable</option><option>Postponed</option><option>Access issue</option><option>Other</option></select></label><label>Notes (required)<textarea required rows="4" value={notDone.notes} onChange={(event) => setNotDone({ ...notDone, notes: event.target.value })} style={input} /></label><label>Next date (optional)<input type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={notDone.nextScheduledAt} onChange={(event) => setNotDone({ ...notDone, nextScheduledAt: event.target.value })} style={input} /></label><button disabled={saving} type="submit" style={secondary}>{saving ? 'Saving...' : 'Notify manager'}</button></form></div>}</div>;
};

const stats = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 };
const stat = { background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(15,23,42,.08)', display: 'flex', flexDirection: 'column', gap: 7 };
const section = { background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 1px 4px rgba(15,23,42,.08)' };
const list = { display: 'grid', gap: 14 };
const visitCard = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 18, display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' };
const primary = { border: 0, borderRadius: 7, padding: '10px 13px', background: '#1d4ed8', color: '#fff', cursor: 'pointer', display: 'inline-flex', gap: 7, alignItems: 'center' };
const secondary = { ...primary, background: '#fee2e2', color: '#991b1b' };
const statusStyle = (status) => ({ display: 'inline-block', borderRadius: 5, padding: '4px 8px', fontSize: 12, background: status === 'DONE' ? '#dcfce7' : status === 'MISSED' ? '#fee2e2' : '#dbeafe', color: status === 'DONE' ? '#166534' : status === 'MISSED' ? '#991b1b' : '#1d4ed8' });
const backdrop = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 30 };
const modal = { ...section, width: 'min(540px, 92vw)', maxHeight: '90vh', overflowY: 'auto' };
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const close = { border: 0, background: '#e2e8f0', borderRadius: 6, padding: '8px 11px', cursor: 'pointer' };
const input = { display: 'block', width: '100%', boxSizing: 'border-box', padding: 9, margin: '6px 0 14px', border: '1px solid #cbd5e1', borderRadius: 6 };

export default SalesExecutiveDashboard;
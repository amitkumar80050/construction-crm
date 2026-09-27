import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaChartBar, FaClipboardCheck, FaExchangeAlt, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import managerService from '../../services/managerService';

const stages = ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'];

const ManagerDashboard = () => {
  const [view, setView] = useState('overview');
  const [data, setData] = useState({ totalLeads: 0, stages: [], callsDone: 0, siteVisits: {}, pendingAttendance: 0, team: [], unassignedLeads: [], teamLeads: [] });
  const [attendance, setAttendance] = useState([]);
  const [selected, setSelected] = useState([]);
  const [assignmentUserId, setAssignmentUserId] = useState('');
  const [attendancePeriod, setAttendancePeriod] = useState('week');
  const [visitLead, setVisitLead] = useState(null);
  const [visit, setVisit] = useState({ executiveId: '', scheduledAt: '', address: '', priority: 'MEDIUM', notes: '' });
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await managerService.getDashboard();
      setData(result.data?.data || data);
      if (view === 'attendance') setAttendance((await managerService.getAttendance({ period: attendancePeriod })).data?.data || []);
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load manager workspace'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [view, attendancePeriod]);

  const changeView = async (nextView) => {
    setView(nextView);
  };

  const distribute = async (leadIds = selected, assignedTo = '') => {
    try { const result = await managerService.distribute(leadIds, assignedTo); toast.success(`${result.data.distributed || 0} leads assigned`); setSelected([]); setAssignmentUserId(''); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to distribute leads'); }
  };

  const assignVisit = async (event) => {
    event.preventDefault();
    try { await managerService.assignVisit({ leadId: visitLead._id, ...visit }); toast.success('Site visit assigned'); setVisitLead(null); setVisit({ executiveId: '', scheduledAt: '', address: '', priority: 'MEDIUM', notes: '' }); load(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to assign site visit'); }
  };

  const updateAttendance = async (record, decision) => {
    const note = (remarks[record._id] || '').trim();
    if (decision === 'REJECTED' && !note) { toast.error('Enter a reason before rejecting attendance.'); return; }
    try {
      if (decision === 'APPROVED') await attendanceService.approve(record._id, note);
      else await attendanceService.reject(record._id, note);
      toast.success(`Attendance ${decision.toLowerCase()}`);
      setAttendance((items) => items.map((item) => item._id === record._id
        ? { ...item, status: decision, managerRemarks: note }
        : item));
      load();
    }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update attendance'); }
  };

  const stageCount = (name) => data.stages.find((stage) => stage._id === name)?.count || 0;
  const tabs = [['overview', 'Team dashboard', FaChartBar], ['distribution', 'Lead distribution', FaExchangeAlt], ['visits', 'Site visits', FaMapMarkerAlt], ['attendance', `Attendance (${data.pendingAttendance})`, FaClipboardCheck]];

  return <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
    <header style={{ marginBottom: 24 }}><h1 style={{ color: '#172033', margin: 0 }}>Manager workspace</h1><p style={{ color: '#64748b' }}>Your team at a glance, with the actions that keep work moving.</p></header>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>{tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => changeView(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 0, borderRadius: 8, padding: '10px 14px', background: view === key ? '#1d4ed8' : '#e8eef8', color: view === key ? '#fff' : '#334155', cursor: 'pointer' }}><Icon />{label}</button>)}</div>
    {loading ? <p>Loading team data...</p> : <>
      {view === 'overview' && <>
        <div style={gridStyle}>{[['Total leads', data.totalLeads, FaUsers], ['Calls completed', data.callsDone, FaChartBar], ['Visits scheduled', data.siteVisits.planned || 0, FaMapMarkerAlt], ['Visits done', data.siteVisits.done || 0, FaClipboardCheck], ['Visits missed', data.siteVisits.missed || 0, FaMapMarkerAlt], ['Pending approvals', data.pendingAttendance, FaClipboardCheck]].map(([label, value, Icon]) => <div key={label} style={cardStyle}><Icon color="#176b55" size={22} /><strong style={{ fontSize: 28, color: '#172033' }}>{value}</strong><span style={{ color: '#64748b' }}>{label}</span></div>)}</div>
        <section style={sectionStyle}><h2>Lead funnel</h2>{stages.map((stage) => <div key={stage} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 45px', alignItems: 'center', gap: 12, margin: '12px 0' }}><span>{stage.replaceAll('_', ' ')}</span><div style={{ height: 10, background: '#e2e8f0', borderRadius: 6 }}><div style={{ width: `${data.totalLeads ? Math.max(4, stageCount(stage) / data.totalLeads * 100) : 0}%`, height: '100%', background: '#2563eb', borderRadius: 6 }} /></div><b>{stageCount(stage)}</b></div>)}</section>
        <section style={sectionStyle}><h2>Team members</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{data.team.map((member) => <div key={member._id} style={{ padding: 14, background: '#f8fafc', borderRadius: 8 }}><b>{member.name}</b><div style={{ color: '#64748b', fontSize: 13 }}>{member.role} · {member.email}</div></div>)}</div></section>
      </>}
      {view === 'distribution' && <section style={sectionStyle}><div style={headingStyle}><div><h2>Unassigned leads</h2><p style={{ color: '#64748b' }}>Select leads for a manual assignment or distribute them round-robin.</p></div><button type="button" onClick={() => distribute([])} style={primaryButton}>Auto-distribute all</button></div><div style={{ overflowX: 'auto' }}><table style={tableStyle}><thead><tr><th><input aria-label="Select all unassigned leads" type="checkbox" checked={data.unassignedLeads.length > 0 && selected.length === data.unassignedLeads.length} onChange={(event) => setSelected(event.target.checked ? data.unassignedLeads.map((lead) => lead._id) : [])} /></th><th>Lead</th><th>Company</th><th>Stage</th></tr></thead><tbody>{data.unassignedLeads.map((lead) => <tr key={lead._id}><td><input aria-label={`Select ${lead.name}`} type="checkbox" checked={selected.includes(lead._id)} onChange={() => setSelected((items) => items.includes(lead._id) ? items.filter((id) => id !== lead._id) : [...items, lead._id])} /></td><td>{lead.name}</td><td>{lead.company || '-'}</td><td>{lead.pipelineStage}</td></tr>)}</tbody></table></div>{selected.length > 0 && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}><select aria-label="Assign selected leads to Telecaller" value={assignmentUserId} onChange={(event) => setAssignmentUserId(event.target.value)} style={inputStyle}><option value="">Choose Telecaller</option>{data.team.filter((member) => member.role === 'telecaller').map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select><button type="button" disabled={!assignmentUserId} onClick={() => distribute(selected, assignmentUserId)} style={{ ...primaryButton, opacity: assignmentUserId ? 1 : .55 }}>Assign {selected.length} selected</button><button type="button" onClick={() => distribute(selected)} style={{ ...primaryButton, background: '#176b55' }}>Round-robin {selected.length} selected</button></div>}</section>}
      {view === 'visits' && <section style={sectionStyle}><h2>Schedule a site visit</h2><p style={{ color: '#64748b' }}>Leads must reach Site Visit Planned before an executive can be assigned.</p><div style={gridStyle}>{data.team.filter((member) => member.role === 'sales executer').map((member) => <div key={member._id} style={{ ...cardStyle, alignItems: 'flex-start' }}><b>{member.name}</b><span style={{ color: '#64748b' }}>{member.email}</span></div>)}</div><table style={tableStyle}><thead><tr><th>Lead</th><th>Stage</th><th /></tr></thead><tbody>{data.teamLeads.length === 0 ? <tr><td colSpan="3">No team leads are available.</td></tr> : data.teamLeads.map((lead) => <tr key={lead._id}><td>{lead.name}</td><td>{lead.pipelineStage}</td><td>{lead.pipelineStage === 'SITE_VISIT_PLANNED' ? <button type="button" onClick={() => setVisitLead(lead)} style={linkButton}>Assign executive</button> : 'Not ready'}</td></tr>)}</tbody></table></section>}
      {view === 'attendance' && <section style={sectionStyle}><div style={headingStyle}><h2>Team attendance</h2><select aria-label="Attendance period" value={attendancePeriod} onChange={(event) => setAttendancePeriod(event.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 5 }}><option value="today">Today</option><option value="week">This week</option><option value="all">All records</option></select></div><div style={{ overflowX: 'auto' }}><table style={tableStyle}><thead><tr><th>Employee</th><th>Date</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Manager remark</th><th>Action</th></tr></thead><tbody>{attendance.map((record) => <tr key={record._id}><td>{record.user?.name}</td><td>{record.date}</td><td>{record.checkInTime || record.markedAt ? new Date(record.checkInTime || record.markedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '-'}</td><td>{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not checked out'}</td><td>{record.status}</td><td>{record.managerRemarks || record.rejectionReason || '-'}</td><td>{record.status === 'PENDING' ? <><input aria-label={`Optional manager remark for ${record.user?.name || 'employee'}`} value={remarks[record._id] || ''} onChange={(event) => setRemarks({ ...remarks, [record._id]: event.target.value })} placeholder="Optional" /><button type="button" onClick={() => updateAttendance(record, 'APPROVED')} style={approveButton}>Approve</button> <button type="button" onClick={() => updateAttendance(record, 'REJECTED')} style={rejectButton}>Reject</button></> : 'Reviewed'}</td></tr>)}</tbody></table></div>{attendance.length === 0 && <p style={{ color: '#64748b' }}>No attendance records for this period.</p>}</section>}
    </>}
    {visitLead && <div style={modalBackdrop}><form onSubmit={assignVisit} style={{ ...sectionStyle, width: 'min(520px, 90vw)' }}><div style={headingStyle}><h2>Assign site visit</h2><button type="button" onClick={() => setVisitLead(null)} style={linkButton}>Close</button></div><p><b>{visitLead.name}</b> · {visitLead.company}</p><label>Executive<select required value={visit.executiveId} onChange={(event) => setVisit({ ...visit, executiveId: event.target.value })} style={inputStyle}><option value="">Select executive</option>{data.team.filter((member) => member.role === 'sales executer').map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label><label>Date and time<input required type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={visit.scheduledAt} onChange={(event) => setVisit({ ...visit, scheduledAt: event.target.value })} style={inputStyle} /></label><label>Location<input required value={visit.address} onChange={(event) => setVisit({ ...visit, address: event.target.value })} style={inputStyle} /></label><label>Priority<select required value={visit.priority} onChange={(event) => setVisit({ ...visit, priority: event.target.value })} style={inputStyle}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label><label>Comments<textarea required value={visit.notes} onChange={(event) => setVisit({ ...visit, notes: event.target.value })} style={inputStyle} /></label><button type="submit" style={primaryButton}>Assign visit</button></form></div>}
  </div>;
};

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 };
const cardStyle = { background: '#fff', padding: 18, borderRadius: 10, boxShadow: '0 1px 4px rgba(15,23,42,.08)', display: 'flex', flexDirection: 'column', gap: 8 };
const sectionStyle = { background: '#fff', padding: 22, borderRadius: 10, boxShadow: '0 1px 4px rgba(15,23,42,.08)', marginBottom: 20 };
const headingStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 };
const primaryButton = { border: 0, borderRadius: 7, padding: '10px 14px', background: '#1d4ed8', color: '#fff', cursor: 'pointer' };
const linkButton = { border: 0, background: 'none', color: '#1d4ed8', cursor: 'pointer' };
const approveButton = { border: 0, borderRadius: 6, padding: '7px 10px', background: '#dcfce7', color: '#166534', cursor: 'pointer' };
const rejectButton = { border: 0, borderRadius: 6, padding: '7px 10px', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const inputStyle = { display: 'block', width: '100%', margin: '6px 0 14px', padding: 9, boxSizing: 'border-box' };
const modalBackdrop = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, .45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 };

export default ManagerDashboard;
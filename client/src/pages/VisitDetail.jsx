import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import siteVisitService from '../services/siteVisitService';
import VisitCompletedModal from '../components/visits/VisitCompletedModal';
import VisitNotDoneModal from '../components/visits/VisitNotDoneModal';

const normalizeVisitStatus = (status) => {
  if (status === 'SCHEDULED' || status === 'PLANNED') return 'PLANNED';
  if (status === 'COMPLETED' || status === 'DONE') return 'DONE';
  if (status === 'NOT_DONE' || status === 'MISSED') return 'MISSED';
  return status;
};

const VisitDetail = () => {
  const { id } = useParams();
  const [visit, setVisit] = useState(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showNotDone, setShowNotDone] = useState(false);

  const load = () => siteVisitService.getVisit(id).then((res) => setVisit(res.data.data)).catch(() => toast.error('Unable to load visit'));
  useEffect(() => { load(); }, [id]);

  if (!visit) return <div style={{ padding: '24px' }}>Loading...</div>;

  const normalizedStatus = normalizeVisitStatus(visit.status);

  return (
    <div style={{ padding: '24px', maxWidth: '500px' }}>
      <h1 style={{ fontSize: '22px' }}>{visit.lead.name}</h1>
      <p style={{ color: '#64748b' }}>{visit.lead.phone}</p>
      <p style={{ color: '#64748b' }}>{visit.lead.address?.street}</p>
      <p>Scheduled: {new Date(visit.scheduledAt).toLocaleString()}</p>
      <p>Status: <strong>{normalizedStatus}</strong></p>

      {normalizedStatus === 'PLANNED' && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setShowComplete(true)} style={{ flex: 1, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px' }}>Visit Completed</button>
          <button onClick={() => setShowNotDone(true)} style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px' }}>Not Done</button>
        </div>
      )}

      {showComplete && <VisitCompletedModal visitId={id} onClose={() => setShowComplete(false)} onDone={() => { setShowComplete(false); load(); }} />}
      {showNotDone && <VisitNotDoneModal visitId={id} onClose={() => setShowNotDone(false)} onDone={() => { setShowNotDone(false); load(); }} />}
    </div>
  );
};
export default VisitDetail;
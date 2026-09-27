import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import siteVisitService from '../services/siteVisitService';

const MyVisits = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    siteVisitService.getMyVisits('PLANNED')
      .then((res) => setVisits(res.data.data))
      .catch(() => toast.error('Unable to load visits'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', color: '#1e293b' }}>My Visits</h1>
      {loading ? <p>Loading...</p> : visits.length === 0 ? <p style={{ color: '#94a3b8' }}>No upcoming visits.</p> : (
        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
          {visits.map((v) => (
            <div key={v._id} onClick={() => navigate(`/visits/${v._id}`)} style={{ background: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
              <strong>{v.lead?.name}</strong>
              <p style={{ margin: '4px 0', color: '#64748b', fontSize: '13px' }}>{v.lead?.address?.street || v.lead?.company}</p>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#94a3b8' }}>
                <span><FaClock size={10} /> {new Date(v.scheduledAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default MyVisits;
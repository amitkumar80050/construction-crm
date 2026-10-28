import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaMapMarkerAlt, FaCompass, FaPhoneAlt, FaWhatsapp,
  FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaArrowLeft,
  FaCrosshairs
} from 'react-icons/fa';
import siteVisitService from '../services/siteVisitService';
import { SERVER_URL } from '../services/api';
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
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showNotDone, setShowNotDone] = useState(false);

  const load = () => {
    siteVisitService.getVisit(id)
      .then((res) => setVisit(res.data.data))
      .catch(() => toast.error('Unable to load visit'));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!visit) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading visit details...
      </div>
    );
  }

  const normalizedStatus = normalizeVisitStatus(visit.status);
  const address = visit.address || visit.lead?.address?.street || 'Site location';
  const leadPhone = visit.lead?.phone;

  return (
    <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: '#2563eb',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <FaArrowLeft /> Back
      </button>

      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
              {visit.lead?.name || 'Lead Details'}
            </h1>
            {visit.lead?.company && (
              <div style={{ color: '#64748b', fontSize: '14px' }}>🏢 {visit.lead.company}</div>
            )}
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              background: normalizedStatus === 'DONE' ? '#dcfce7' : normalizedStatus === 'MISSED' ? '#fee2e2' : '#dbeafe',
              color: normalizedStatus === 'DONE' ? '#166534' : normalizedStatus === 'MISSED' ? '#991b1b' : '#1e40af',
            }}
          >
            {normalizedStatus}
          </span>
        </div>

        <div style={{ display: 'grid', gap: '12px', fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaCalendarAlt color="#2563eb" />
            <strong>Scheduled:</strong> {new Date(visit.scheduledAt).toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaMapMarkerAlt color="#0284c7" />
            <strong>Location:</strong> {address}
          </div>
          {visit.notes && (
            <div>
              <strong>Manager Notes:</strong> {visit.notes}
            </div>
          )}
          {visit.notDoneReason && (
            <div style={{ color: '#dc2626' }}>
              <strong>Not Done Reason:</strong> {visit.notDoneReason}
            </div>
          )}
          {normalizedStatus === 'DONE' && (visit.latitude || visit.longitude) && (
            <div style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaCrosshairs />
              <strong>Verified GPS:</strong> {visit.latitude?.toFixed(6)}, {visit.longitude?.toFixed(6)}
            </div>
          )}
          {normalizedStatus === 'DONE' && visit.photoUrl && (
            <div style={{ marginTop: '8px' }}>
              <strong>Photo Proof:</strong>
              <div style={{ marginTop: '6px' }}>
                <img
                  src={visit.photoUrl.startsWith('http') ? visit.photoUrl : `${SERVER_URL}${visit.photoUrl}`}
                  alt="Proof"
                  style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              background: '#0284c7',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <FaCompass /> Navigate
          </a>

          {leadPhone && (
            <>
              <a
                href={`tel:${leadPhone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  background: '#f1f5f9',
                  color: '#1e293b',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                }}
              >
                <FaPhoneAlt color="#2563eb" size={12} /> Call
              </a>

              <a
                href={`https://wa.me/${leadPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  background: '#dcfce7',
                  color: '#15803d',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #bbf7d0',
                }}
              >
                <FaWhatsapp size={14} /> WhatsApp
              </a>
            </>
          )}
        </div>

        {normalizedStatus === 'PLANNED' && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setShowComplete(true)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✓ Visit Completed
            </button>
            <button
              onClick={() => setShowNotDone(true)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✕ Not Done
            </button>
          </div>
        )}

        {showComplete && (
          <VisitCompletedModal
            visitId={id}
            onClose={() => setShowComplete(false)}
            onDone={() => { setShowComplete(false); load(); }}
          />
        )}
        {showNotDone && (
          <VisitNotDoneModal
            visitId={id}
            onClose={() => setShowNotDone(false)}
            onDone={() => { setShowNotDone(false); load(); }}
          />
        )}
      </div>
    </div>
  );
};

export default VisitDetail;
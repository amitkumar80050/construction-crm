import React, { useState } from 'react';
import { toast } from 'react-toastify';
import siteVisitService from '../../services/siteVisitService';

const VisitCompletedModal = ({ visitId, onClose, onDone }) => {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      toast.error('Geolocation not supported on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocating(false); toast.error('Unable to get location — enable location permissions'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!photo) return toast.error('Live photo is required');
    if (!location) return toast.error('Location not available yet — please wait or retry');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);
      formData.append('notes', notes);
      await siteVisitService.completeVisit(visitId, formData);
      toast.success('Visit marked completed');
      onDone();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to complete visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '340px' }}>
        <h3>Visit Completed</h3>

        <label style={{ display: 'block', margin: '12px 0 6px', fontSize: '13px', fontWeight: 600 }}>Camera Photo *</label>
        <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
        {preview && <img src={preview} alt="preview" style={{ width: '100%', marginTop: '8px', borderRadius: '8px' }} />}

        <label style={{ display: 'block', margin: '14px 0 6px', fontSize: '13px', fontWeight: 600 }}>Location</label>
        <input
          readOnly
          value={locating ? 'Fetching location...' : location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Unavailable'}
          style={{ width: '100%', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />

        <label style={{ display: 'block', margin: '14px 0 6px', fontSize: '13px', fontWeight: 600 }}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={submit} disabled={submitting} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px' }}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default VisitCompletedModal;
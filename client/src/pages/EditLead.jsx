import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import Leadservice from '../services/leadService';
import LeadForm from '../components/leads/LeadForm';

const EditLead = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [Lead, setLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await Leadservice.getLead(id);
        const leadData = res.data?.data?.lead || res.data?.data;
        setLead(leadData || null);
      } catch (error) {
        toast.error('Unable to load Lead');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      await Leadservice.updateLead(id, payload);
      toast.success('Lead updated successfully!');
      navigate(`/Leads/${id}`);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to update Lead';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '960px', margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(`/Leads/${id}`)}
          style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontWeight: 600, fontSize: '13px' }}
        >
          <FaArrowLeft size={12} /> Back to Lead
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Edit Lead</h1>
      </div>

      <div>
        <LeadForm
          initialData={Lead}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/Leads/${id}`)}
          saving={saving}
          submitLabel="Update Lead"
        />
      </div>
    </div>
  );
};

export default EditLead;

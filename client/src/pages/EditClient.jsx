import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import clientService from '../services/clientService';
import ClientForm from '../components/clients/ClientForm';

const EditClient = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await clientService.getClient(id);
        setClient(res.data?.data || null);
      } catch (error) {
        toast.error('Unable to load client');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      await clientService.updateClient(id, payload);
      toast.success('Client updated successfully!');
      navigate(`/clients/${id}`);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to update client';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(`/clients/${id}`)}
          style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}
        >
          <FaArrowLeft /> Back
        </button>
        <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Edit Lead</h1>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '800px' }}>
        <ClientForm
          initialData={client}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/clients/${id}`)}
          saving={saving}
          submitLabel="Update Lead"
        />
      </div>
    </div>
  );
};

export default EditClient;
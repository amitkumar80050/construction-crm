import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import clientService from '../services/clientService';
import PDFUploader from '../components/PDFUploader';
import ClientForm from '../components/clients/ClientForm';

const AddClient = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [pdfData, setPdfData] = useState(null);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      await clientService.createClient(payload);
      toast.success('Client added successfully!');
      navigate('/clients');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to save client';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle extracted data from PDF
  const handlePDFDataExtracted = (extractedData) => {
    setPdfData(extractedData);

    const filledFields = Object.keys(extractedData).filter(
      (key) => extractedData[key] && String(extractedData[key]).trim()
    ).length;

    toast.success(`PDF processed! Extracted ${filledFields} fields automatically.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePDFError = (errorMessage) => {
    toast.error(errorMessage);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => navigate('/clients')}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#475569'
          }}
        >
          <FaArrowLeft /> Back
        </button>
        <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Add New Lead</h1>
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '800px'
      }}>
        {/* PDF Upload Section */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FaFilePdf style={{ color: '#dc2626' }} />
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>
              Auto-fill from PDF
            </h3>
            <span style={{
              fontSize: '12px',
              background: '#e2e8f0',
              padding: '2px 8px',
              borderRadius: '12px',
              color: '#475569'
            }}>
              New
            </span>
          </div>
          <p style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#64748b'
          }}>
            Upload a PDF document (proposal, contract, or client form) to automatically extract and fill lead information
          </p>

          <PDFUploader
            onDataExtracted={handlePDFDataExtracted}
            onError={handlePDFError}
          />
        </div>

        {/* Client form, pre-filled from PDF if data was extracted */}
        <ClientForm
          initialData={
            pdfData
              ? {
                  name: pdfData.name,
                  company: pdfData.company,
                  email: pdfData.email,
                  phone: pdfData.phone,
                  status: 'lead',
                  projectValue: pdfData.projectValue,
                  notes: pdfData.notes,
                  address: {
                    street: pdfData.address,
                    city: pdfData.city,
                    state: pdfData.state,
                    zipCode: pdfData.zipCode
                  }
                }
              : null
          }
          onSubmit={handleSubmit}
          onCancel={() => navigate('/clients')}
          saving={saving}
          submitLabel="Save Lead"
        />
      </div>
    </div>
  );
};

export default AddClient;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaFilePdf, FaUserPlus, FaShieldAlt } from 'react-icons/fa';
import Leadservice from '../services/leadService';
import PDFUploader from '../components/PDFUploader';
import LeadForm from '../components/leads/LeadForm';
import { useAuth } from '../hooks/useAuth';

const AddLead = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [showPdfUploader, setShowPdfUploader] = useState(false);

  // Security check: Only Admin and Manager can access this page
  const isAuthorized = ['admin', 'manager'].includes(user?.role);

  useEffect(() => {
    if (user && !isAuthorized) {
      toast.error('Access restricted: Only Admins and Managers can add new leads.');
      navigate('/Leads', { replace: true });
    }
  }, [user, isAuthorized, navigate]);

  if (!isAuthorized) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <FaShieldAlt size={36} color="#ef4444" style={{ marginBottom: '12px' }} />
        <h2>Access Denied</h2>
        <p>Only Administrators and Managers are authorized to create or add new leads.</p>
      </div>
    );
  }

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      await Leadservice.createLead(payload);
      toast.success('Lead added successfully!');
      navigate('/Leads');
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to save Lead';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

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
    <div style={{ padding: '24px 32px', maxWidth: '960px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/Leads')}
            style={{
              padding: '9px 16px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <FaArrowLeft size={12} /> Back to Leads
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaUserPlus color="#2563eb" size={22} /> Add New Lead
            </h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
              Enter prospect credentials, specify team scoping, and initialize pipeline stage.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPdfUploader((prev) => !prev)}
          style={{
            padding: '9px 16px',
            background: showPdfUploader ? '#fee2e2' : '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: showPdfUploader ? '#dc2626' : '#334155',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <FaFilePdf color="#dc2626" /> {showPdfUploader ? 'Hide PDF Uploader' : 'Auto-fill from PDF'}
        </button>
      </div>

      {/* Optional PDF Auto-Fill Card */}
      {showPdfUploader && (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FaFilePdf style={{ color: '#dc2626' }} />
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 700 }}>
              AI Document Reader & Auto-Fill
            </h3>
            <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Time Saver
            </span>
          </div>
          <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b' }}>
            Upload a proposal, contract, or inquiry sheet to automatically extract contact name, phone, address, and estimated budget.
          </p>

          <PDFUploader
            onDataExtracted={handlePDFDataExtracted}
            onError={handlePDFError}
          />
        </div>
      )}

      {/* Main Lead Form */}
      <LeadForm
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
        onCancel={() => navigate('/Leads')}
        saving={saving}
        submitLabel="Create & Save Lead"
      />
    </div>
  );
};

export default AddLead;

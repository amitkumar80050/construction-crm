import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaFileExcel, FaFileCsv, FaSpinner } from 'react-icons/fa';
import importService from '../../services/importService';
import teamService from '../../services/teamService';
import { useAuth } from '../../hooks/useAuth';

export const AUTO_MAP_ALIASES = {
  Name: [
    'name', 'lead name', 'leadname', 'customer name', 'customername',
    'client name', 'clientname', 'full name', 'fullname', 'contact person',
    'party name', 'lead', 'prospect name', 'customer', 'client'
  ],
  Phone: [
    'phone', 'phone number', 'phonenumber', 'phone no', 'phone_no', 'phoneno', 'phone no.',
    'mobile', 'mobile number', 'mobilenumber', 'mobile no', 'mobile_no', 'mobileno', 'mobile no.',
    'cell', 'cell phone', 'cellphone', 'telephone', 'tel', 'whatsapp', 'whatsapp number',
    'contact no', 'contact number', 'contactno', 'contact_number', 'contact no.'
  ],
  Email: [
    'email', 'email address', 'emailaddress', 'e-mail', 'email id', 'email_id',
    'emailid', 'email id.', 'mail', 'e-mail address', 'e-mail id'
  ],
  Contact: [
    'contact', 'contact info', 'phone or email', 'contact details'
  ],
  Address: [
    'address', 'location', 'site address', 'city', 'area', 'street', 'full address'
  ],
  Source: [
    'source', 'lead source', 'leadsource', 'lead_source', 'source name',
    'campaign', 'channel', 'platform', 'medium', 'origin', 'referral', 'utm_source'
  ],
  Company: [
    'company', 'company name', 'companyname', 'organization', 'firm', 'business name'
  ],
  Status: [
    'status', 'lead status', 'leadstatus'
  ],
  Stage: [
    'stage', 'pipeline stage', 'current stage', 'pipelinestage'
  ],
  ProjectValue: [
    'project value', 'projectvalue', 'budget', 'value', 'deal value', 'dealvalue',
    'amount', 'estimated value', 'deal size'
  ],
  Notes: [
    'notes', 'remark', 'remarks', 'comment', 'comments', 'description', 'message'
  ],
  assignedTo: [
    'assigned to', 'assigned user', 'assigned employee', 'owner', 'assignedto'
  ],
};

const REQUIRED_FIELDS = ['Name'];

export function buildAutoMapping(detectedColumns) {
  const mapping = {};
  detectedColumns.forEach((col) => {
    const raw = String(col || '').trim().toLowerCase();
    const clean = raw.replace(/[^a-z0-9]/g, '');
    for (const [field, aliases] of Object.entries(AUTO_MAP_ALIASES)) {
      const isMatch = aliases.some((alias) => {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        return raw === alias.toLowerCase() || clean === cleanAlias;
      });
      if (isMatch) {
        mapping[col] = field;
        break;
      }
    }
  });
  return mapping;
}

const QuickLeadUpload = ({ onImported }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [importing, setImporting] = useState(false);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');

  useEffect(() => {
    if (!['admin', 'manager'].includes(user?.role)) return;
    teamService.getTeams().then((response) => {
      const list = response.data?.data || [];
      setTeams(list);
      setTeamId((current) => current || list[0]?._id || '');
    }).catch(() => toast.error('Unable to load teams for lead import'));
  }, [user?.role]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const isExcel = ext === 'xls' || ext === 'xlsx';
    const isCSV = ext === 'csv';

    if (!isExcel && !isCSV) {
      toast.error('Please upload a .csv, .xls, or .xlsx file');
      return;
    }

    setUploading(true);
    try {
      const uploadResponse = isExcel
        ? await importService.uploadExcel(file)
        : await importService.uploadCSV(file);

      const data = uploadResponse.data.data;

      if (isExcel && data.sheetNames && data.sheetNames.length > 1) {
        toast.info('This file has multiple sheets — opening the full import wizard to select one.');
        navigate('/import', { state: { preloaded: data } });
        return;
      }

      const mapping = buildAutoMapping(data.detectedColumns);
      const mappedFields = new Set(Object.values(mapping));
      const hasName = mappedFields.has('Name');
      const hasContact = ['Contact', 'Phone', 'Email'].some((field) => mappedFields.has(field));

      if (!hasName || !hasContact) {
        const missing = [];
        if (!hasName) missing.push('Lead Name');
        if (!hasContact) missing.push('Contact (phone or email)');
        toast.info(
          `Couldn't auto-detect column(s) for: ${missing.join(', ')}. Opening the full import wizard so you can map them manually.`
        );
        navigate('/import', { state: { preloaded: data } });
        return;
      }

      const previewResponse = await importService.preview({
        tempFilePath: data.tempFilePath,
        fileType: data.fileType,
        sheetName: data.activeSheet,
        columnMapping: mapping,
      });
      const preview = previewResponse.data.data;

      setPendingImport({
        tempFilePath: data.tempFilePath,
        fileType: data.fileType,
        fileName: data.fileName,
        activeSheet: data.activeSheet,
        mapping,
        preview,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    if (user?.role === 'manager' && !teamId) {
      toast.error('Select a team before importing leads.');
      return;
    }
    setImporting(true);
    try {
      const response = await importService.process({
        tempFilePath: pendingImport.tempFilePath,
        fileType: pendingImport.fileType,
        sheetName: pendingImport.activeSheet,
        columnMapping: pendingImport.mapping,
        duplicateStrategy: 'skip',
        module: 'leads',
        fileName: pendingImport.fileName,
        teamId: teamId || undefined,
      });
      const result = response.data.data;

      toast.success(`Imported ${result.imported} lead${result.imported !== 1 ? 's' : ''} successfully!`);
      setPendingImport(null);
      onImported?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.xls,.xlsx"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {['admin', 'manager'].includes(user?.role) && <select aria-label="Import team" value={teamId} onChange={(event) => setTeamId(event.target.value)} style={{ padding: '10px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          <option value="">Select team</option>
          {teams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}
        </select>}
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={uploading}
          style={{
            padding: '10px 20px',
            background: '#176b55',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {uploading ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <><FaFileExcel /> Upload Leads File</>}
        </button>
      </div>

      {pendingImport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              {pendingImport.fileType === 'excel' ? <FaFileExcel color="#16a34a" /> : <FaFileCsv color="#22c55e" />}
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>{pendingImport.fileName}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#16a34a' }}>New Leads</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{pendingImport.preview.validRecords}</div>
              </div>
              <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#d97706' }}>Duplicates (skipped)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{pendingImport.preview.duplicateRecords}</div>
              </div>
              <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#dc2626' }}>Invalid rows</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{pendingImport.preview.invalidRecords}</div>
              </div>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Total Rows</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{pendingImport.preview.totalRecords}</div>
              </div>
            </div>

            {pendingImport.preview.invalidRecords > 0 && (
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                Invalid rows will be skipped. Need more detail on why they failed? Use the full{' '}
                <button onClick={() => navigate('/import')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  import wizard
                </button> instead.
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingImport(null)}
                disabled={importing}
                style={{ padding: '10px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || pendingImport.preview.validRecords === 0}
                style={{
                  padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '8px', cursor: importing ? 'not-allowed' : 'pointer',
                }}
              >
                {importing ? 'Importing...' : `Import ${pendingImport.preview.validRecords} Lead${pendingImport.preview.validRecords !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickLeadUpload;
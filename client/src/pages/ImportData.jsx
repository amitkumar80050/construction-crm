// client/src/pages/ImportData.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { FaHistory, FaUpload, FaFileDownload } from 'react-icons/fa';
import ImportLeads from './ImportLeads';
import importService from '../services/importService';
import { toast } from 'react-toastify';

const TABS = {
  IMPORT: 'import',
  HISTORY: 'history',
};

const ImportData = () => {
  const [activeTab, setActiveTab] = useState(TABS.IMPORT);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const response = await importService.getHistory();
      setLogs(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load import history');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === TABS.HISTORY) {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const tabButtonStyle = (tab) => ({
    padding: '10px 18px',
    background: activeTab === tab ? '#2563eb' : 'transparent',
    color: activeTab === tab ? 'white' : '#475569',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>Import Data</h1>
        <a
          href={importService.getTemplateUrl('leads')}
          style={{
            padding: '10px 16px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FaFileDownload size={12} /> Download Leads Template
        </a>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button style={tabButtonStyle(TABS.IMPORT)} onClick={() => setActiveTab(TABS.IMPORT)}>
          <FaUpload size={13} /> New Import
        </button>
        <button style={tabButtonStyle(TABS.HISTORY)} onClick={() => setActiveTab(TABS.HISTORY)}>
          <FaHistory size={13} /> Import History
        </button>
      </div>

      {activeTab === TABS.IMPORT && <ImportLeads />}

      {activeTab === TABS.HISTORY && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {loadingLogs ? (
            <p style={{ color: '#64748b' }}>Loading history...</p>
          ) : logs.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No imports yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Module</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>File</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>By</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>Total</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>Imported</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>Failed</th>
                    <th style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', color: '#475569' }}>{formatDate(log.createdAt)}</td>
                      <td style={{ padding: '10px', color: '#475569', textTransform: 'capitalize' }}>{log.module}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>{log.fileName}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>{log.user?.name || '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#1e293b' }}>{log.totalRecords}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#22c55e' }}>{log.importedRecords}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: log.failedRecords > 0 ? '#ef4444' : '#94a3b8' }}>
                        {log.failedRecords}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {log.failedRecords > 0 && (
                          <a
                            href={importService.getErrorReportUrl(log._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2563eb' }}
                          >
                            <FaFileDownload size={13} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportData;
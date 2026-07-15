import React, { useState } from 'react';
import {
  FaCheckCircle, FaExclamationTriangle, FaCopy, FaFileDownload,
  FaUpload, FaTimes, FaEye
} from 'react-icons/fa';

/**
 * Expected `preview` shape (adjust once the backend contract is finalized):
 * {
 *   totalRecords: number,
 *   validRecords: number,
 *   invalidRecords: number,
 *   duplicateRecords: number,
 *   rows: [
 *     {
 *       rowNumber: number,
 *       data: { name, company, email, phone, ... },  // mapped CRM fields
 *       status: 'valid' | 'invalid' | 'duplicate',
 *       errors?: string[]   // present if status === 'invalid'
 *     }
 *   ],
 *   errorReport: [
 *     { row: number, column: string, value: string, reason: string, suggestedFix: string }
 *   ]
 * }
 */
const ImportPreviewTable = ({
  preview,
  duplicateStrategy,
  onStrategyChange,
  onDownloadErrorReport,
  onImport,
  onCancel,
  importing
}) => {
  const { totalRecords, validRecords, invalidRecords, duplicateRecords, errorReport = [], rows = [] } = preview;
  const [showAllRows, setShowAllRows] = useState(false);
  const [rowFilter, setRowFilter] = useState('all');

  const statCard = (label, value, color, icon) => (
    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '140px' }}>
      <div style={{ color, fontSize: '20px' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  );

  const getRowStatusStyle = (status) => {
    switch (status) {
      case 'invalid': return { background: '#fef2f2', color: '#dc2626' };
      case 'duplicate': return { background: '#fffbeb', color: '#d97706' };
      default: return { background: '#f0fdf4', color: '#16a34a' };
    }
  };

  const filteredRows = rows.filter((row) => rowFilter === 'all' || row.status === rowFilter);
  const visibleRows = showAllRows ? filteredRows : filteredRows.slice(0, 10);

  const importDisabled = importing || validRecords === 0;

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Import Preview</h3>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {statCard('Total Records', totalRecords, '#2563eb', '📄')}
        {statCard('Valid / New', validRecords, '#22c55e', <FaCheckCircle />)}
        {statCard('Invalid', invalidRecords, '#ef4444', <FaExclamationTriangle />)}
        {statCard('Duplicates', duplicateRecords, '#f59e0b', <FaCopy />)}
      </div>

      {duplicateRecords > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Duplicate Handling Strategy</label>
          <select
            value={duplicateStrategy}
            onChange={(e) => onStrategyChange(e.target.value)}
            style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', width: '100%', maxWidth: '320px' }}
          >
            <option value="skip">Skip Duplicates</option>
            <option value="update">Update Existing</option>
            <option value="replace">Replace Existing</option>
            <option value="only_new">Import Only New Records</option>
          </select>
        </div>
      )}

      {/* Row-by-row data preview */}
      {rows.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaEye size={13} color="#64748b" />
              <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>Data Preview</h4>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'valid', 'duplicate', 'invalid'].map((f) => (
                <button
                  key={f}
                  onClick={() => setRowFilter(f)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    background: rowFilter === f ? '#2563eb' : '#f1f5f9',
                    color: rowFilter === f ? 'white' : '#475569',
                    textTransform: 'capitalize'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Row</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Name</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Company</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Email</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Phone</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.rowNumber} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{row.rowNumber}</td>
                    <td style={{ padding: '10px', color: '#1e293b' }}>{row.data?.name || '—'}</td>
                    <td style={{ padding: '10px', color: '#475569' }}>{row.data?.company || '—'}</td>
                    <td style={{ padding: '10px', color: '#475569' }}>{row.data?.email || '—'}</td>
                    <td style={{ padding: '10px', color: '#475569' }}>{row.data?.phone || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        ...getRowStatusStyle(row.status)
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      No rows match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 10 && (
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              style={{
                marginTop: '10px',
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: '13px',
                padding: 0
              }}
            >
              {showAllRows ? 'Show fewer rows' : `Show all ${filteredRows.length} rows`}
            </button>
          )}
        </div>
      )}

      {/* Validation errors */}
      {errorReport.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
              Validation Errors ({errorReport.length})
            </h4>
            {onDownloadErrorReport && (
              <button
                onClick={onDownloadErrorReport}
                style={{
                  padding: '6px 12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaFileDownload size={11} /> Download Report
              </button>
            )}
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #fee2e2', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#fef2f2' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Row</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Column</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Reason</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Suggested Fix</th>
                </tr>
              </thead>
              <tbody>
                {errorReport.slice(0, 50).map((err, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #fee2e2' }}>
                    <td style={{ padding: '8px' }}>{err.row}</td>
                    <td style={{ padding: '8px' }}>{err.column}</td>
                    <td style={{ padding: '8px', color: '#dc2626' }}>{err.reason}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{err.suggestedFix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {errorReport.length > 50 && (
              <div style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', borderTop: '1px solid #fee2e2' }}>
                Showing first 50 of {errorReport.length} errors — download the full report for all details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={importing}
            style={{
              padding: '10px 20px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              cursor: importing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaTimes size={12} /> Cancel
          </button>
        )}
        {onImport && (
          <button
            onClick={onImport}
            disabled={importDisabled}
            title={validRecords === 0 ? 'No valid records to import' : undefined}
            style={{
              padding: '10px 20px',
              background: importDisabled ? '#93c5fd' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: importDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaUpload size={12} /> {importing ? 'Importing...' : `Import ${validRecords} Record${validRecords !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default ImportPreviewTable;
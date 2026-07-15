import React from 'react';
import {
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaClock,
  FaFileDownload, FaRedo, FaListOl, FaUserPlus, FaSyncAlt, FaBan
} from 'react-icons/fa';

/**
 * Displays the result of a completed import run.
 *
 * Expected `summary` shape (adjust once the backend contract is finalized):
 * {
 *   totalUploaded: number,
 *   imported: number,
 *   updated: number,
 *   skipped: number,
 *   duplicate: number,
 *   failed: number,
 *   importDuration: number,   // in milliseconds
 *   errorReportId?: string    // present only if there were failures
 * }
 */
const ImportSummary = ({ summary, onDownloadErrorReport, onImportAnother, onClose }) => {
  if (!summary) return null;

  const {
    totalUploaded = 0,
    imported = 0,
    updated = 0,
    skipped = 0,
    duplicate = 0,
    failed = 0,
    importDuration = 0
  } = summary;

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const stats = [
    { label: 'Total Uploaded', value: totalUploaded, icon: FaListOl, color: '#64748b' },
    { label: 'Imported', value: imported, icon: FaUserPlus, color: '#22c55e' },
    { label: 'Updated', value: updated, icon: FaSyncAlt, color: '#2563eb' },
    { label: 'Skipped', value: skipped, icon: FaBan, color: '#f59e0b' },
    { label: 'Duplicates', value: duplicate, icon: FaExclamationTriangle, color: '#8b5cf6' },
    { label: 'Failed', value: failed, icon: FaTimesCircle, color: '#ef4444' }
  ];

  const successRate = totalUploaded > 0
    ? (((imported + updated) / totalUploaded) * 100).toFixed(1)
    : 0;

  const isFullySuccessful = failed === 0 && skipped === 0;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '28px',
      maxWidth: '720px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: isFullySuccessful ? '#dcfce7' : '#fef3c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isFullySuccessful ? (
            <FaCheckCircle size={24} color="#22c55e" />
          ) : (
            <FaExclamationTriangle size={22} color="#d97706" />
          )}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>
            {isFullySuccessful ? 'Import Completed Successfully' : 'Import Completed with Issues'}
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaClock size={11} /> Finished in {formatDuration(importDuration)}
          </p>
        </div>
      </div>

      {/* Success rate bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
          <span>Success Rate</span>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{successRate}%</span>
        </div>
        <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{
            width: `${successRate}%`,
            height: '100%',
            background: successRate >= 90 ? '#22c55e' : successRate >= 60 ? '#f59e0b' : '#ef4444',
            borderRadius: '20px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: `${stat.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: stat.color,
              flexShrink: 0
            }}>
              <stat.icon size={15} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Failure / duplicate callouts */}
      {(failed > 0 || duplicate > 0) && (
        <div style={{
          padding: '14px 16px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <FaExclamationTriangle size={14} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: '#92400e' }}>
            {failed > 0 && (
              <p style={{ margin: 0 }}>
                <strong>{failed}</strong> record{failed !== 1 ? 's' : ''} failed validation and were not imported.
              </p>
            )}
            {duplicate > 0 && (
              <p style={{ margin: failed > 0 ? '4px 0 0' : 0 }}>
                <strong>{duplicate}</strong> duplicate record{duplicate !== 1 ? 's' : ''} detected based on email/phone matching existing leads.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {failed > 0 && onDownloadErrorReport && (
          <button
            onClick={onDownloadErrorReport}
            style={{
              padding: '10px 18px',
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <FaFileDownload size={13} /> Download Error Report
          </button>
        )}

        {onImportAnother && (
          <button
            onClick={onImportAnother}
            style={{
              padding: '10px 18px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <FaRedo size={12} /> Import Another File
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};

export default ImportSummary;
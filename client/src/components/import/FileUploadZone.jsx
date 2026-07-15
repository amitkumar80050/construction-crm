import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaFileCsv, FaFileExcel, FaSpinner } from 'react-icons/fa';

const FileUploadZone = ({ onFileSelected, uploading }) => {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? '#2563eb' : '#cbd5e1'}`,
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        cursor: uploading ? 'not-allowed' : 'pointer',
        background: isDragActive ? '#eff6ff' : '#f8fafc',
      }}
    >
      <input {...getInputProps()} disabled={uploading} />
      {uploading ? (
        <>
          <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '32px', color: '#2563eb' }} />
          <p style={{ marginTop: '12px', color: '#475569' }}>Processing file...</p>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '32px', marginBottom: '12px' }}>
            <FaFileCsv color="#22c55e" />
            <FaFileExcel color="#16a34a" />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b' }}>
            {isDragActive ? 'Drop the file here' : 'Drag & drop CSV or Excel file, or click to browse'}
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Supports .csv, .xls, .xlsx (max 15MB)</p>
        </>
      )}
    </div>
  );
};

export default FileUploadZone;
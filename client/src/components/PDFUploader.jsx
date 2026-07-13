import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaFilePdf, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';
import pdfParserService from '../services/pdfParserService';

const PDFUploader = ({ onDataExtracted, onError }) => {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    // Check if file is PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      const errorMsg = 'Please upload a valid PDF file';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'File size should be less than 10MB';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setUploading(true);
    setFileName(file.name);
    setError('');

    try {
      const extractedData = await pdfParserService.processPDF(file);
      setUploaded(true);
      if (onDataExtracted) {
        onDataExtracted(extractedData);
      }
      
      // Reset upload state after 3 seconds
      setTimeout(() => {
        setUploaded(false);
        setFileName('');
        setUploading(false);
      }, 3000);
    } catch (error) {
      const errorMsg = error.message || 'Failed to process PDF';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      setUploading(false);
      setFileName('');
    }
  }, [onDataExtracted, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${error ? '#dc2626' : isDragActive ? '#2563eb' : '#cbd5e1'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: error ? '#fef2f2' : isDragActive ? '#eff6ff' : '#f8fafc',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
            <span>Processing PDF...</span>
          </div>
        ) : uploaded ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#16a34a' }}>
            <FaCheck />
            <span>PDF processed successfully!</span>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#dc2626' }}>
            <FaTimes />
            <span>{error}</span>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>
              <FaFilePdf style={{ color: '#dc2626' }} />
            </div>
            <div style={{ fontWeight: '500', color: '#1e293b' }}>
              {isDragActive ? 'Drop your PDF here' : 'Upload PDF to auto-fill lead information'}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
              Drag & drop a PDF file here, or click to select
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Supported formats: PDF (Max 10MB)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add animation styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default PDFUploader;
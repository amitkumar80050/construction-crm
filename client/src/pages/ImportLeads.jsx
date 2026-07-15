// client/src/pages/ImportLeads.jsx
import React, { useState } from 'react';
import { FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import FileUploadZone from '../components/import/FileUploadZone';
import ColumnMapper from '../components/import/ColumnMapper';
import ImportPreviewTable from '../components/import/ImportPreviewTable';
import ImportSummary from '../components/import/ImportSummary';
import importService from '../services/importService';
import { toast } from 'react-toastify';

const STEPS = {
  UPLOAD: 'upload',
  SELECT_SHEET: 'select_sheet',
  MAP: 'map',
  PREVIEW: 'preview',
  SUMMARY: 'summary',
};

const MODULE = 'leads';

const initialUploadState = {
  tempFilePath: null,
  fileType: null,
  fileName: null,
  detectedColumns: [],
  crmFields: [],
  sheetNames: [],
  activeSheet: null,
};

const ImportLeads = () => {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [uploading, setUploading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);

  const [uploadState, setUploadState] = useState(initialUploadState);
  const [mapping, setMapping] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');
  const [summary, setSummary] = useState(null);

  const resetAll = () => {
    setStep(STEPS.UPLOAD);
    setUploadState(initialUploadState);
    setMapping({});
    setPreviewData(null);
    setDuplicateStrategy('skip');
    setSummary(null);
  };

  // --- Step 1: Upload ---
  const handleFileSelected = async (file) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const isExcel = ext === 'xls' || ext === 'xlsx';

      const response = isExcel
        ? await importService.uploadExcel(file)
        : await importService.uploadCSV(file);

      const data = response.data.data;

      setUploadState({
        tempFilePath: data.tempFilePath,
        fileType: data.fileType,
        fileName: data.fileName,
        detectedColumns: data.detectedColumns,
        crmFields: data.crmFields,
        sheetNames: data.sheetNames || [],
        activeSheet: data.activeSheet || null,
      });

      // Auto-map columns whose name matches a CRM field label/key
      const autoMapping = {};
      data.detectedColumns.forEach((col) => {
        const match = data.crmFields.find(
          (f) => f.label.toLowerCase() === col.toLowerCase() || f.key.toLowerCase() === col.toLowerCase()
        );
        if (match) autoMapping[col] = match.key;
      });
      setMapping(autoMapping);

      // If it's an Excel file with more than one sheet, let the user pick
      if (isExcel && data.sheetNames && data.sheetNames.length > 1) {
        setStep(STEPS.SELECT_SHEET);
      } else {
        setStep(STEPS.MAP);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // --- Step 2 (optional): Select sheet ---
  const handleSelectSheet = async (sheetName) => {
    setUploading(true);
    try {
      const response = await importService.selectSheet({
        tempFilePath: uploadState.tempFilePath,
        sheetName,
      });
      const data = response.data.data;

      setUploadState((prev) => ({
        ...prev,
        activeSheet: data.activeSheet,
        detectedColumns: data.detectedColumns,
      }));

      const autoMapping = {};
      data.detectedColumns.forEach((col) => {
        const match = uploadState.crmFields.find(
          (f) => f.label.toLowerCase() === col.toLowerCase() || f.key.toLowerCase() === col.toLowerCase()
        );
        if (match) autoMapping[col] = match.key;
      });
      setMapping(autoMapping);

      setStep(STEPS.MAP);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to read sheet');
    } finally {
      setUploading(false);
    }
  };

  // --- Step 3: Column mapping ---
  const requiredFieldsMapped = () => {
    const requiredKeys = uploadState.crmFields.filter((f) => f.required).map((f) => f.key);
    const mappedKeys = new Set(Object.values(mapping).filter(Boolean));
    return requiredKeys.every((key) => mappedKeys.has(key));
  };

  const handleContinueToPreview = async () => {
    if (!requiredFieldsMapped()) {
      toast.error('Please map all required fields before continuing');
      return;
    }

    setLoadingPreview(true);
    try {
      const response = await importService.preview({
        tempFilePath: uploadState.tempFilePath,
        fileType: uploadState.fileType,
        sheetName: uploadState.activeSheet,
        columnMapping: mapping,
      });
      const data = response.data.data;

      // Backend doesn't return a unified `rows` array — build one from the
      // valid/duplicate previews it does return so ImportPreviewTable can render it.
      const rows = [
        ...(data.validPreview || []).map((row, i) => ({
          rowNumber: row.rowNumber ?? i + 1,
          data: row,
          status: 'valid',
        })),
        ...(data.duplicatePreview || []).map((row, i) => ({
          rowNumber: row.rowNumber ?? `d${i + 1}`,
          data: row,
          status: 'duplicate',
        })),
      ];

      setPreviewData({ ...data, rows });
      setStep(STEPS.PREVIEW);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  // --- Step 4: Preview -> Process import ---
  const handleImport = async () => {
    setImporting(true);
    try {
      const response = await importService.process({
        tempFilePath: uploadState.tempFilePath,
        fileType: uploadState.fileType,
        sheetName: uploadState.activeSheet,
        columnMapping: mapping,
        duplicateStrategy,
        module: MODULE,
        fileName: uploadState.fileName,
      });
      const data = response.data.data;

      setSummary({
        ...data,
        importDuration: data.durationMs,
      });
      setStep(STEPS.SUMMARY);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    const id = summary?.importLogId;
    if (!id) return;
    window.open(importService.getErrorReportUrl(id), '_blank');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        {step !== STEPS.UPLOAD && step !== STEPS.SUMMARY && (
          <button
            onClick={() => setStep(STEPS.UPLOAD)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            title="Start over"
          >
            <FaArrowLeft />
          </button>
        )}
        <h2 style={{ margin: 0, color: '#1e293b' }}>Import Leads</h2>
      </div>

      {step === STEPS.UPLOAD && (
        <FileUploadZone onFileSelected={handleFileSelected} uploading={uploading} />
      )}

      {step === STEPS.SELECT_SHEET && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaFileExcel color="#16a34a" /> Select a sheet to import
          </h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {uploadState.sheetNames.map((sheet) => (
              <button
                key={sheet}
                onClick={() => handleSelectSheet(sheet)}
                disabled={uploading}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                }}
              >
                {sheet}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === STEPS.MAP && (
        <>
          <ColumnMapper
            detectedColumns={uploadState.detectedColumns}
            crmFields={uploadState.crmFields}
            mapping={mapping}
            onChange={setMapping}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={handleContinueToPreview}
              disabled={loadingPreview}
              style={{
                padding: '10px 20px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loadingPreview ? 'not-allowed' : 'pointer',
              }}
            >
              {loadingPreview ? 'Validating...' : 'Continue to Preview'}
            </button>
          </div>
        </>
      )}

      {step === STEPS.PREVIEW && previewData && (
        <ImportPreviewTable
          preview={previewData}
          duplicateStrategy={duplicateStrategy}
          onStrategyChange={setDuplicateStrategy}
          onDownloadErrorReport={
            previewData.errorReport?.length ? () => toast.info('Full error report available after import completes') : undefined
          }
          onImport={handleImport}
          onCancel={() => setStep(STEPS.MAP)}
          importing={importing}
        />
      )}

      {step === STEPS.SUMMARY && summary && (
        <ImportSummary
          summary={summary}
          onDownloadErrorReport={summary.failed > 0 ? handleDownloadErrorReport : undefined}
          onImportAnother={resetAll}
          onClose={resetAll}
        />
      )}
    </div>
  );
};

export default ImportLeads;
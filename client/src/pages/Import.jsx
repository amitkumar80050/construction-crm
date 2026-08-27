import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import importService from '../services/importService';
import FileUploadZone from '../components/import/FileUploadZone';
import ColumnMapper from '../components/import/ColumnMapper';
import ImportPreviewTable from '../components/import/ImportPreviewTable';
import ImportSummary from '../components/import/ImportSummary';

const STEPS = { UPLOAD: 'upload', MAP: 'map', PREVIEW: 'preview', DONE: 'done' };

const Import = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.UPLOAD);
  const [uploading, setUploading] = useState(false);

  const [crmFields, setCrmFields] = useState([]);
  const [fileInfo, setFileInfo] = useState(null); // { tempFilePath, fileType, fileName, detectedColumns, sheetNames, activeSheet }
  const [mapping, setMapping] = useState({});

  const [previewData, setPreviewData] = useState(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    importService.getCrmFields()
      .then((res) => setCrmFields(res.data?.data || []))
      .catch(() => toast.error('Failed to load field list'));
  }, []);

  const resetWizard = () => {
    setStep(STEPS.UPLOAD);
    setFileInfo(null);
    setMapping({});
    setPreviewData(null);
    setSummary(null);
  };

  // --- Step 1: Upload -----------------------------------------------------
  const handleFileSelected = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const isExcel = ext === 'xls' || ext === 'xlsx';

    setUploading(true);
    try {
      const res = isExcel
        ? await importService.uploadExcel(file)
        : await importService.uploadCSV(file);
      const data = res.data.data;

      setFileInfo(data);
      setMapping({}); // reset any prior mapping
      setStep(STEPS.MAP);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSheetChange = async (sheetName) => {
    try {
      const res = await importService.selectSheet({ tempFilePath: fileInfo.tempFilePath, sheetName });
      const data = res.data.data;
      setFileInfo((prev) => ({ ...prev, detectedColumns: data.detectedColumns, activeSheet: data.activeSheet }));
      setMapping({});
    } catch (error) {
      toast.error('Failed to switch sheet');
    }
  };

  // --- Step 2: Mapping → Preview -------------------------------------------
  const handleBuildPreview = async () => {
    const requiredFields = crmFields.filter((f) => f.required).map((f) => f.key);
    const mappedFields = new Set(Object.values(mapping));
    const missing = requiredFields.filter((f) => !mappedFields.has(f));

    if (missing.length > 0) {
      toast.error(`Please map required field(s): ${missing.join(', ')}`);
      return;
    }

    try {
      const res = await importService.preview({
        tempFilePath: fileInfo.tempFilePath,
        fileType: fileInfo.fileType,
        sheetName: fileInfo.activeSheet,
        columnMapping: mapping,
      });
      setPreviewData(res.data.data);
      setStep(STEPS.PREVIEW);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to build preview');
    }
  };

  // --- Step 3: Preview → Import -------------------------------------------
  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const res = await importService.process({
        tempFilePath: fileInfo.tempFilePath,
        fileType: fileInfo.fileType,
        sheetName: fileInfo.activeSheet,
        columnMapping: mapping,
        duplicateStrategy,
        fileName: fileInfo.fileName,
      });
      setSummary(res.data.data);
      setStep(STEPS.DONE);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    const rows = (summary?.errorReport || previewData?.errorReport || []);
    if (rows.length === 0) return;

    const header = ['Row', 'Column', 'Value', 'Reason', 'Suggested Fix'];
    const csvLines = [
      header.join(','),
      ...rows.map((r) =>
        [r.row, r.column, `"${(r.value || '').replace(/"/g, '""')}"`, `"${r.reason.replace(/"/g, '""')}"`, `"${(r.suggestedFix || '').replace(/"/g, '""')}"`].join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-error-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/clients')}
          style={{
            padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569'
          }}
        >
          <FaArrowLeft /> Back to Leads
        </button>
        <div>
          <h1 style={{ fontSize: '24px', color: '#1e293b', margin: 0 }}>Import Leads</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14px' }}>
            Upload a CSV or Excel file to bulk-add leads to your CRM.
          </p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === STEPS.UPLOAD && (
        <FileUploadZone onFileSelected={handleFileSelected} uploading={uploading} />
      )}

      {/* Step 2: Map columns */}
      {step === STEPS.MAP && fileInfo && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {fileInfo.sheetNames && fileInfo.sheetNames.length > 1 && (
            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Sheet</label>
              <select
                value={fileInfo.activeSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '200px' }}
              >
                {fileInfo.sheetNames.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <ColumnMapper
            detectedColumns={fileInfo.detectedColumns}
            crmFields={crmFields}
            mapping={mapping}
            onChange={setMapping}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={resetWizard}
              style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleBuildPreview}
              style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Continue to Preview
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & confirm */}
      {step === STEPS.PREVIEW && previewData && (
        <ImportPreviewTable
          preview={previewData}
          duplicateStrategy={duplicateStrategy}
          onStrategyChange={setDuplicateStrategy}
          onDownloadErrorReport={handleDownloadErrorReport}
          onImport={handleConfirmImport}
          onCancel={() => setStep(STEPS.MAP)}
          importing={importing}
        />
      )}

      {/* Step 4: Done */}
      {step === STEPS.DONE && summary && (
        <ImportSummary
          summary={summary}
          onDownloadErrorReport={summary.failed > 0 ? handleDownloadErrorReport : undefined}
          onImportAnother={resetWizard}
          onClose={() => navigate('/clients')}
        />
      )}
    </div>
  );
};

export default Import;
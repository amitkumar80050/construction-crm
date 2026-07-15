// client/src/pages/ExportData.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FaFileCsv, FaFileExcel, FaFilePdf, FaHistory, FaFilter,
  FaColumns, FaEye, FaDownload, FaSpinner, FaCheck, FaTimes, FaSave
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import exportService, { downloadBlob } from '../services/exportService';

const TABS = { EXPORT: 'export', HISTORY: 'history' };

// Fallback module list (used only if GET /export/modules hasn't returned yet)
const DEFAULT_MODULES = [
  { key: 'leads', label: 'Leads' },
  { key: 'customers', label: 'Customers' },
  { key: 'users', label: 'Users' },
  { key: 'projects', label: 'Projects' },
  { key: 'followups', label: 'Follow-ups' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'activityLogs', label: 'Activity Logs' },
  { key: 'analytics', label: 'Analytics Reports' },
  { key: 'dashboard', label: 'Dashboard Reports' },
  { key: 'leadSources', label: 'Lead Sources' },
  { key: 'leadStages', label: 'Lead Stages' },
];

const SCOPE_OPTIONS = [
  { key: 'all', label: 'All Records' },
  { key: 'filtered', label: 'Filtered Records' },
  { key: 'selected', label: 'Selected Records' },
  { key: 'currentPage', label: 'Current Page' },
  { key: 'assigned', label: 'Assigned to Me' },
];

const initialFilters = {
  startDate: '',
  endDate: '',
  status: '',
  stage: '',
  source: '',
  assignedUser: '',
  priority: '',
  callStatus: '',
  reminderStatus: '',
  city: '',
  state: '',
  minBudget: '',
  maxBudget: '',
};

const ExportData = () => {
  const [activeTab, setActiveTab] = useState(TABS.EXPORT);

  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [selectedModule, setSelectedModule] = useState('leads');
  const [scope, setScope] = useState('all');
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);

  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(null); // 'csv' | 'excel' | 'pdf' | null

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Load available modules + templates on mount ---
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [modulesRes, templatesRes] = await Promise.all([
          exportService.getModules(),
          exportService.getTemplates(),
        ]);
        if (modulesRes.data?.data?.length) {
          setModules(modulesRes.data.data);
        }
        setTemplates(templatesRes.data?.data || []);
      } catch (error) {
        // Non-fatal: fall back to default module list, no templates
        console.error('Failed to load export config:', error.message);
      }
    };
    loadInitial();
  }, []);

  // --- Load columns whenever the module changes ---
  useEffect(() => {
    const currentModule = modules.find((m) => m.key === selectedModule);
    const cols = currentModule?.columns || [];
    setAvailableColumns(cols);
    setSelectedColumns(cols.map((c) => c.key)); // default: all columns selected
    setPreview(null);
  }, [selectedModule, modules]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => setFilters(initialFilters);

  const toggleColumn = (key) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const moveColumn = (index, direction) => {
    setSelectedColumns((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const activeFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
    [filters]
  );

  const buildPayload = () => ({
    module: selectedModule,
    scope,
    filters: scope === 'filtered' ? activeFilters : {},
    columns: selectedColumns,
  });

  // --- Preview ---
  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await exportService.preview(buildPayload());
      setPreview(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  // --- Export actions ---
  const handleExport = async (format) => {
    if (selectedColumns.length === 0) {
      toast.error('Select at least one column to export');
      return;
    }

    setExporting(format);
    try {
      const payload = buildPayload();
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${selectedModule}-export-${timestamp}.${format === 'excel' ? 'xlsx' : format}`;

      let response;
      if (format === 'csv') response = await exportService.exportCSV(payload);
      else if (format === 'excel') response = await exportService.exportExcel(payload);
      else response = await exportService.exportPDF(payload);

      downloadBlob(response, filename);
      toast.success(`${format.toUpperCase()} export downloaded`);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  // --- Templates ---
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Enter a template name');
      return;
    }
    setSavingTemplate(true);
    try {
      const response = await exportService.saveTemplate({
        name: templateName.trim(),
        module: selectedModule,
        columns: selectedColumns,
        filters: activeFilters,
        scope,
      });
      setTemplates((prev) => [...prev, response.data.data]);
      setTemplateName('');
      toast.success('Template saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadTemplate = (template) => {
    setSelectedModule(template.module);
    setSelectedColumns(template.columns || []);
    setFilters({ ...initialFilters, ...(template.filters || {}) });
    setScope(template.scope || 'filtered');
    setPreview(null);
    toast.info(`Loaded template "${template.name}"`);
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await exportService.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      toast.success('Template deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  // --- History ---
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await exportService.getHistory();
      setHistory(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load export history');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === TABS.HISTORY) fetchHistory();
  }, [activeTab, fetchHistory]);

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

  const card = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ margin: '0 0 24px', color: '#1e293b', fontSize: '24px' }}>Export Data</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button style={tabButtonStyle(TABS.EXPORT)} onClick={() => setActiveTab(TABS.EXPORT)}>
          <FaDownload size={13} /> New Export
        </button>
        <button style={tabButtonStyle(TABS.HISTORY)} onClick={() => setActiveTab(TABS.HISTORY)}>
          <FaHistory size={13} /> Export History
        </button>
      </div>

      {activeTab === TABS.EXPORT && (
        <div style={{ display: 'grid', gap: '20px' }}>

          {/* Module + Scope */}
          <div style={card}>
            <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>What do you want to export?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>Module</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                >
                  {modules.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>Scope</label>
                <select
                  value={scope}
                  onChange={(e) => { setScope(e.target.value); setPreview(null); }}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                >
                  {SCOPE_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', background: 'none',
                border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', padding: 0
              }}
            >
              <FaFilter size={12} /> {showFilters ? 'Hide filters' : 'Show advanced filters'}
            </button>

            {showFilters && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Start Date</label>
                    <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>End Date</label>
                    <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Status</label>
                    <input value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Stage</label>
                    <input value={filters.stage} onChange={(e) => handleFilterChange('stage', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Source</label>
                    <input value={filters.source} onChange={(e) => handleFilterChange('source', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Assigned User</label>
                    <input value={filters.assignedUser} onChange={(e) => handleFilterChange('assignedUser', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Priority</label>
                    <input value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>City</label>
                    <input value={filters.city} onChange={(e) => handleFilterChange('city', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>State</label>
                    <input value={filters.state} onChange={(e) => handleFilterChange('state', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Min Budget</label>
                    <input type="number" value={filters.minBudget} onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Max Budget</label>
                    <input type="number" value={filters.maxBudget} onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  </div>
                </div>
                <button
                  onClick={resetFilters}
                  style={{ marginTop: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Column selection */}
          {availableColumns.length > 0 && (
            <div style={card}>
              <h3 style={{ marginBottom: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaColumns size={15} /> Columns
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {availableColumns.map((col) => (
                  <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>

              {selectedColumns.length > 0 && (
                <>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Column order (selected columns)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedColumns.map((key, i) => {
                      const col = availableColumns.find((c) => c.key === key);
                      return (
                        <div key={key} style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
                          background: '#f1f5f9', borderRadius: '20px', fontSize: '12px'
                        }}>
                          <button onClick={() => moveColumn(i, -1)} disabled={i === 0}
                            style={{ border: 'none', background: 'none', cursor: i === 0 ? 'default' : 'pointer', color: '#64748b' }}>◀</button>
                          {col?.label || key}
                          <button onClick={() => moveColumn(i, 1)} disabled={i === selectedColumns.length - 1}
                            style={{ border: 'none', background: 'none', cursor: i === selectedColumns.length - 1 ? 'default' : 'pointer', color: '#64748b' }}>▶</button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Templates */}
          <div style={card}>
            <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Templates</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', flex: 1, minWidth: '200px' }}
              />
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                style={{
                  padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '8px', cursor: savingTemplate ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <FaSave size={12} /> {savingTemplate ? 'Saving...' : 'Save Current Setup'}
              </button>
            </div>

            {templates.length > 0 && (
              <div style={{ display: 'grid', gap: '8px' }}>
                {templates.map((t) => (
                  <div key={t._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: '#f8fafc', borderRadius: '8px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{t.name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'capitalize' }}>{t.module}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleLoadTemplate(t)}
                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px' }}>
                        Load
                      </button>
                      <button onClick={() => handleDeleteTemplate(t._id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaEye size={15} /> Preview
              </h3>
              <button
                onClick={handlePreview}
                disabled={loadingPreview}
                style={{
                  padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none',
                  borderRadius: '8px', cursor: loadingPreview ? 'not-allowed' : 'pointer', fontSize: '13px'
                }}
              >
                {loadingPreview ? 'Loading...' : 'Refresh Preview'}
              </button>
            </div>

            {preview ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Total Records</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{preview.totalRecords}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Selected Records</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{preview.selectedRecords}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Columns</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{selectedColumns.length}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Est. File Size</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{preview.estimatedFileSize || '—'}</div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>Click "Refresh Preview" to see record counts before exporting.</p>
            )}
          </div>

          {/* Export actions */}
          <div style={{ ...card, display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleExport('csv')}
              disabled={!!exporting}
              style={{
                padding: '12px 20px', background: '#22c55e', color: 'white', border: 'none',
                borderRadius: '8px', cursor: exporting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {exporting === 'csv' ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaFileCsv />}
              CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={!!exporting}
              style={{
                padding: '12px 20px', background: '#16a34a', color: 'white', border: 'none',
                borderRadius: '8px', cursor: exporting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {exporting === 'excel' ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaFileExcel />}
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              style={{
                padding: '12px 20px', background: '#dc2626', color: 'white', border: 'none',
                borderRadius: '8px', cursor: exporting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {exporting === 'pdf' ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaFilePdf />}
              PDF
            </button>
          </div>
        </div>
      )}

      {activeTab === TABS.HISTORY && (
        <div style={card}>
          {loadingHistory ? (
            <p style={{ color: '#64748b' }}>Loading history...</p>
          ) : history.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No exports yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Module</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Format</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>By</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>Records</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => (
                    <tr key={log._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', color: '#475569' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '10px', color: '#475569', textTransform: 'capitalize' }}>{log.module}</td>
                      <td style={{ padding: '10px', color: '#475569', textTransform: 'uppercase' }}>{log.format}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>{log.user?.name || '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#1e293b' }}>{log.recordCount}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                          background: log.status === 'success' ? '#dcfce7' : '#fef2f2',
                          color: log.status === 'success' ? '#16a34a' : '#dc2626'
                        }}>
                          {log.status}
                        </span>
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

export default ExportData;
const { listModules } = require('../utils/exportModuleRegistry');
const exportService = require('../services/exportService');
const ExportLog = require('../models/ExportLog');
const ExportTemplate = require('../models/ExportTemplate');

const MIME_TYPES = {
  csv: 'text/csv',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};
const EXTENSIONS = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

const getModules = async (req, res) => {
  res.status(200).json({ success: true, data: listModules() });
};

const previewExport = async (req, res) => {
  try {
    const { module: moduleKey, scope, filters, selectedIds, columns } = req.body;
    const result = await exportService.preview({
      moduleKey,
      scope,
      filters,
      selectedIds,
      columns,
      user: req.user,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Preview failed' });
  }
};

const handleExport = (format) => async (req, res) => {
  const { module: moduleKey, scope, filters, selectedIds, columns } = req.body;
  let logStatus = 'success';
  let errorMessage;
  let recordCount = 0;
  let durationMs = 0;

  try {
    const result = await exportService.exportData({
      moduleKey,
      scope,
      filters,
      selectedIds,
      columns,
      format,
      user: req.user,
      meta: { generatedBy: req.user.name, orientation: req.body.orientation },
    });

    recordCount = result.recordCount;
    durationMs = result.durationMs;

    res.setHeader('Content-Type', MIME_TYPES[format]);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${moduleKey}-export-${Date.now()}.${EXTENSIONS[format]}"`
    );
    res.status(200).send(result.buffer);
  } catch (error) {
    console.error(error);
    logStatus = 'failed';
    errorMessage = error.message;
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Export failed' });
    }
  } finally {
    // Log every export attempt regardless of outcome
    ExportLog.create({
      user: req.user.id,
      role: req.user.role,
      module: moduleKey,
      exportType: scope || 'all',
      format,
      filters: filters || {},
      columns: columns || [],
      recordCount,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      durationMs,
      status: logStatus,
      errorMessage,
    }).catch((logErr) => console.error('Failed to write export log:', logErr.message));
  }
};

const getHistory = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user.id };
    const logs = await ExportLog.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to load export history' });
  }
};

const getTemplates = async (req, res) => {
  try {
    const templates = await ExportTemplate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to load templates' });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { name, module: moduleKey, columns, filters, scope } = req.body;
    const template = await ExportTemplate.create({
      name,
      module: moduleKey,
      columns,
      filters,
      scope,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to save template' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const template = await ExportTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const template = await ExportTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.status(200).json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
};

module.exports = {
  getModules,
  previewExport,
  exportCSV: handleExport('csv'),
  exportExcel: handleExport('excel'),
  exportPDF: handleExport('pdf'),
  getHistory,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
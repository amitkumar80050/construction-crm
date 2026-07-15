const { getModule } = require('../utils/exportModuleRegistry');
const { generateCSV, generateExcel, generatePDF } = require('../utils/exportGenerators');

const MAX_EXPORT_RECORDS = 50000; // safety cap for memory/perf

function assertAccess(moduleConfig, user) {
  if (moduleConfig.adminOnly && user.role !== 'admin') {
    const err = new Error('You are not authorized to export this module');
    err.statusCode = 403;
    throw err;
  }
}

async function resolveRecords({ moduleKey, scope, filters, selectedIds, user }) {
  const moduleConfig = getModule(moduleKey);
  if (!moduleConfig) {
    const err = new Error(`Export module "${moduleKey}" is not available`);
    err.statusCode = 400;
    throw err;
  }

  assertAccess(moduleConfig, user);

  let query = {};
  query = moduleConfig.applyScope(query, user); // RBAC / data isolation

  if (scope === 'filtered' && filters) {
    query = moduleConfig.applyFilters(query, filters);
  }
  if (scope === 'selected' && selectedIds?.length) {
    query._id = { $in: selectedIds };
  }
  if (scope === 'assigned' && user.role !== 'admin') {
    query.assignedTo = user.id;
  }

  const total = await moduleConfig.model.countDocuments(query);
  if (total > MAX_EXPORT_RECORDS) {
    const err = new Error(
      `This export would include ${total} records, exceeding the ${MAX_EXPORT_RECORDS} limit. Please narrow your filters.`
    );
    err.statusCode = 400;
    throw err;
  }

  const docs = await moduleConfig.model.find(query).lean();
  return { docs, total, moduleConfig };
}

function projectColumns(docs, columns) {
  const keys = columns?.length ? columns : undefined;
  return docs.map((doc) => {
    const row = {};
    const fieldKeys = keys || Object.keys(doc);
    fieldKeys.forEach((key) => {
      row[key] = doc[key];
    });
    return row;
  });
}

async function preview({ moduleKey, scope, filters, selectedIds, columns, user }) {
  const { docs, total, moduleConfig } = await resolveRecords({ moduleKey, scope, filters, selectedIds, user });
  const selectedRecords = docs.length;
  const usedColumns = columns?.length
    ? moduleConfig.columns.filter((c) => columns.includes(c.key))
    : moduleConfig.columns;

  // Rough estimate: ~40 bytes/cell average, refined per format if needed
  const estimatedBytes = selectedRecords * usedColumns.length * 40;
  const estimatedFileSize =
    estimatedBytes > 1024 * 1024
      ? `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(estimatedBytes / 1024))} KB`;

  return {
    totalRecords: total,
    selectedRecords,
    selectedColumns: usedColumns.map((c) => c.label),
    estimatedFileSize,
  };
}

async function exportData({ moduleKey, scope, filters, selectedIds, columns, format, user, meta = {} }) {
  const startTime = Date.now();
  const { docs, moduleConfig } = await resolveRecords({ moduleKey, scope, filters, selectedIds, user });

  const usedColumns = columns?.length
    ? moduleConfig.columns.filter((c) => columns.includes(c.key))
    : moduleConfig.columns;

  const rows = projectColumns(docs, usedColumns.map((c) => c.key));

  let buffer;
  if (format === 'csv') {
    buffer = generateCSV(rows, usedColumns);
  } else if (format === 'excel') {
    buffer = await generateExcel(rows, usedColumns, { sheetName: moduleConfig.label });
  } else if (format === 'pdf') {
    buffer = await generatePDF(rows, usedColumns, {
      title: `${moduleConfig.label} Report`,
      generatedBy: meta.generatedBy,
      appliedFilters: filters || {},
      orientation: meta.orientation || 'landscape',
    });
  } else {
    const err = new Error('Unsupported export format');
    err.statusCode = 400;
    throw err;
  }

  return {
    buffer,
    recordCount: rows.length,
    durationMs: Date.now() - startTime,
  };
}

module.exports = { preview, exportData, resolveRecords };
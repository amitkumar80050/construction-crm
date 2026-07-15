const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

/** Parses a CSV file into an array of row objects. */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

/** Parses an Excel file. Returns { sheetNames, sheets: { [name]: rows[] } } */
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const sheets = {};

  for (const name of sheetNames) {
    const worksheet = workbook.Sheets[name];
    sheets[name] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  return { sheetNames, sheets };
}

/**
 * Applies a column mapping (uploadedColumn -> crmField) to raw rows.
 * mapping example: { "Customer Name": "name", "Mobile": "phone" }
 */
function applyColumnMapping(rows, mapping) {
  return rows.map((row) => {
    const mapped = {};
    for (const [uploadedCol, crmField] of Object.entries(mapping)) {
      if (crmField && row[uploadedCol] !== undefined) {
        mapped[crmField] = typeof row[uploadedCol] === 'string' ? row[uploadedCol].trim() : row[uploadedCol];
      }
    }
    return mapped;
  });
}

/** Splits an array into chunks of a given batch size. */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Generates a downloadable CSV string from an array of objects. */
function toCSV(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => {
      const val = row[col] ?? '';
      const escaped = String(val).replace(/"/g, '""');
      return /[,"\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

module.exports = { parseCSV, parseExcel, applyColumnMapping, chunkArray, toCSV };
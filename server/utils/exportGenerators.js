const { Parser } = require('json2csv'); // npm install json2csv
const ExcelJS = require('exceljs');     // npm install exceljs
const PDFDocument = require('pdfkit');  // npm install pdfkit

// --- CSV ---
function generateCSV(rows, columns) {
  const fields = columns.map((c) => ({ label: c.label, value: c.key }));
  const parser = new Parser({ fields, withBOM: true }); // withBOM => proper UTF-8 in Excel
  return parser.parse(rows);
}

// --- Excel ---
async function generateExcel(rows, columns, { sheetName = 'Export' } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Construction CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }], // freeze header row
  });

  sheet.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.max(c.label.length + 4, 16),
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  };
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + columns.length)}1` };

  rows.forEach((row) => sheet.addRow(row));

  return workbook.xlsx.writeBuffer();
}

// --- PDF ---
function generatePDF(rows, columns, meta = {}) {
  return new Promise((resolve, reject) => {
    const {
      title = 'Export Report',
      companyName = 'Construction CRM',
      generatedBy = 'Unknown',
      appliedFilters = {},
      orientation = 'landscape',
    } = meta;

    const doc = new PDFDocument({ margin: 30, layout: orientation, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(16).text(companyName, { align: 'left' });
    doc.fontSize(13).text(title, { align: 'left' });
    doc.fontSize(9).fillColor('#64748b')
      .text(`Generated: ${new Date().toLocaleString()}  |  By: ${generatedBy}`);

    const filterEntries = Object.entries(appliedFilters).filter(([, v]) => v);
    if (filterEntries.length) {
      doc.text(`Filters: ${filterEntries.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }
    doc.moveDown();
    doc.fillColor('#000');

    // Table
    const startX = doc.page.margins.left;
    let y = doc.y;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usableWidth / columns.length;

    const drawRow = (values, isHeader = false) => {
      doc.fontSize(8).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
      values.forEach((val, i) => {
        doc.text(String(val ?? ''), startX + i * colWidth, y, {
          width: colWidth - 4,
          ellipsis: true,
        });
      });
      y += 18;
      if (y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    };

    drawRow(columns.map((c) => c.label), true);
    doc.moveTo(startX, y - 4).lineTo(startX + usableWidth, y - 4).stroke();

    rows.forEach((row) => {
      drawRow(columns.map((c) => row[c.key]));
    });

    // Footer with page numbers
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94a3b8').text(
        `Page ${i + 1} of ${range.count}`,
        doc.page.margins.left,
        doc.page.height - doc.page.margins.bottom + 10,
        { align: 'center', width: usableWidth }
      );
    }

    doc.end();
  });
}

module.exports = { generateCSV, generateExcel, generatePDF };
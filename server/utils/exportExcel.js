const XLSX = require('xlsx');

const exportToExcel = (data, headers, filename) => {
  try {
    const wsData = [headers];
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value || '';
      });
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    const filePath = `./uploads/exports/${filename}.xlsx`;
    XLSX.writeFile(wb, filePath);
    
    return filePath;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

const importFromExcel = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
};

module.exports = { exportToExcel, importFromExcel };
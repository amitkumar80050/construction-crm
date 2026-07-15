// client/src/services/exportService.js
import api from './api';

const exportService = {
  getModules: async () => api.get('/export/modules'),

  preview: async (payload) => api.post('/export/preview', payload),

  exportCSV: async (payload) => api.post('/export/csv', payload, { responseType: 'blob' }),
  exportExcel: async (payload) => api.post('/export/excel', payload, { responseType: 'blob' }),
  exportPDF: async (payload) => api.post('/export/pdf', payload, { responseType: 'blob' }),

  getHistory: async (params) => api.get('/export/history', { params }),

  getTemplates: async () => api.get('/export/templates'),
  saveTemplate: async (payload) => api.post('/export/templates', payload),
  updateTemplate: async (id, payload) => api.put(`/export/templates/${id}`, payload),
  deleteTemplate: async (id) => api.delete(`/export/templates/${id}`),
};

// Helper: trigger a browser download from a blob response
export const downloadBlob = (blobResponse, filename) => {
  const url = window.URL.createObjectURL(new Blob([blobResponse.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default exportService;
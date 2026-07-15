import api from './api';

const importService = {
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  selectSheet: async (data) => api.post('/import/select-sheet', data),
  preview: async (data) => api.post('/import/preview', data),
  process: async (data) => api.post('/import/process', data),
  getHistory: async () => api.get('/import/history'),
  getErrorReportUrl: (id) => `${api.defaults.baseURL}/import/error-report/${id}`,
  getTemplateUrl: (moduleName) => `${api.defaults.baseURL}/import/template/${moduleName}`,
};

export default importService;
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

  getCrmFields: async () => {
    return await api.get('/import/fields');
  },

  selectSheet: async (data) => {
    return await api.post('/import/select-sheet', data);
  },

  preview: async (data) => {
    return await api.post('/import/preview', data);
  },

  process: async (data) => {
    return await api.post('/import/process', data);
  },
};

export default importService;
import api from './api';

const settingsService = {
  getSettings: async () => api.get('/settings'),
  updateCompany: async (data) => api.put('/settings/company', data),
  updateTheme: async (data) => api.put('/settings/theme', data),
  updateCRM: async (data) => api.put('/settings/crm', data),
  updateNotification: async (data) => api.put('/settings/notification', data),
  updateSecurity: async (data) => api.put('/settings/security', data),
  updateEmail: async (data) => api.put('/settings/email', data),
  updateSystem: async (data) => api.put('/settings/system', data),
  updateDashboard: async (data) => api.put('/settings/dashboard', data),
  updateUpload: async (data) => api.put('/settings/upload', data),
  updateBackup: async (data) => api.put('/settings/backup', data),
  updateActivityLog: async (data) => api.put('/settings/activity-log', data),
  testEmail: async (testRecipient) => api.post('/settings/email/test', { testRecipient }),
  uploadLogo: async (file) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/settings/company/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadFavicon: async (file) => {
    const fd = new FormData();
    fd.append('favicon', file);
    return api.post('/settings/company/favicon', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default settingsService;
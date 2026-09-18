import api from './api';

const activityLogService = {
  getMyLogs: (params) => api.get('/logs/my', { params }),
  getManagedEmployees: () => api.get('/manager/logs/employees'),
  getEmployeeLogs: (userId, params) => api.get(`/manager/logs/${userId}`, { params }),
  getAllLogs: (params) => api.get('/admin/logs', { params }),
};

export default activityLogService;
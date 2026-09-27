import api from './api';

const managerService = {
  getDashboard: () => api.get('/manager/dashboard'),
  distribute: (leadIds, assignedTo) => api.post('/manager/distribute', { leadIds, ...(assignedTo ? { assignedTo } : {}) }),
  assignVisit: (data) => api.post('/manager/assign-visit', data),
  getAttendance: (params) => api.get('/manager/attendance', { params }),
  updateAttendance: (id, data) => api.put(`/manager/attendance/${id}`, data),
};

export default managerService;
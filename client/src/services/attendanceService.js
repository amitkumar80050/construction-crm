import api from './api';

const attendanceService = {
  checkIn: () => api.post('/attendance/checkin'),
  checkOut: () => api.post('/attendance/checkout'),
  mark: () => api.post('/attendance/mark'),
  getMy: () => api.get('/attendance/my'),
  getPending: () => api.get('/attendance/pending'),
  approve: (id, managerRemarks = '') => api.put(`/attendance/${id}/approve`, { managerRemarks }),
  reject: (id, reason) => api.put(`/attendance/${id}/reject`, { reason }),
  review: (id, decision, reason) => api.put(`/attendance/${id}/review`, { decision, rejectionReason: reason }),
};
export default attendanceService;
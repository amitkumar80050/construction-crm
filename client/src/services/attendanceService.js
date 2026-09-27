import api from './api';

const attendanceService = {
  checkIn: (userNotes = '') => api.post('/attendance/checkin', { userNotes }),
  checkOut: () => api.post('/attendance/checkout'),
  mark: () => api.post('/attendance/mark'),
  getMy: () => api.get('/attendance/my'),
  getPending: () => api.get('/attendance/pending'),
  approve: (id, managerRemarks = '') => api.put(`/attendance/${id}/approve`, { managerRemarks }),
  reject: (id, reason) => api.put(`/attendance/${id}/reject`, { reason }),
  review: (id, decision, reason) => api.put(`/attendance/${id}/review`, { decision, rejectionReason: reason }),
  getMyAttendance: async (params) => {
    const res = await api.get('/attendance/my', { params });
    return res.data;
  },
  getPendingAttendance: async () => {
    const res = await api.get('/attendance/pending');
    return res.data;
  },
  getTeamAttendance: async (params) => {
    const res = await api.get('/attendance/team', { params });
    return res.data;
  },
  approveAttendance: async (id, remarks = '') => {
    const res = await api.put(`/attendance/${id}/approve`, { remarks });
    return res.data;
  },
  rejectAttendance: async (id, remarks) => {
    const res = await api.put(`/attendance/${id}/reject`, { remarks });
    return res.data;
  },
};

export default attendanceService;

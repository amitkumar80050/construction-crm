import api from './api';

const attendanceService = {
  checkIn: async (userNotes = '') => {
    const res = await api.post('/attendance/checkin', { userNotes });
    return res.data;
  },

  checkOut: async () => {
    const res = await api.post('/attendance/checkout');
    return res.data;
  },

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

import api from './api';

const inAppNotificationService = {
  getMyNotifications: async (params) => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },

  markAsRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },
};

export default inAppNotificationService;

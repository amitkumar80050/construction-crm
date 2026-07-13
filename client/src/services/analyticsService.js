import api from './api';

const analyticsService = {
  getDashboardAnalytics: async () => {
    return await api.get('/analytics/dashboard');
  },

  getUserPerformance: async () => {
    return await api.get('/analytics/performance');
  },

  getReminderAnalytics: async () => {
    return await api.get('/analytics/reminders');
  },
};

export default analyticsService;
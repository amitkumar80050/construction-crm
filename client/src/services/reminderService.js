import api from './api';

const reminderService = {
  getReminders: async (params) => {
    return await api.get('/reminders', { params });
  },

  getRemindersByClient: async (clientId) => {
    return await api.get('/reminders', { params: { client: clientId } });
  },

  getReminder: async (id) => {
    return await api.get(`/reminders/${id}`);
  },

  createReminder: async (data) => {
    return await api.post('/reminders', data);
  },

  updateReminder: async (id, data) => {
    return await api.put(`/reminders/${id}`, data);
  },

  completeReminder: async (id) => {
    return await api.put(`/reminders/${id}/complete`);
  },

  deleteReminder: async (id) => {
    return await api.delete(`/reminders/${id}`);
  },
};

export default reminderService;
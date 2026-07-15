import api from './api';

const userService = {
  getUsers: async (params) => {
    return await api.get('/users', { params });
  },

  getUser: async (id) => {
    return await api.get(`/users/${id}`);
  },

  createUser: async (data) => {
    return await api.post('/users', data);
  },

  updateUser: async (id, data) => {
    return await api.put(`/users/${id}`, data);
  },

  softDeleteUser: async (id) => {
    return await api.delete(`/users/${id}`);
  },

  restoreUser: async (id) => {
    return await api.put(`/users/${id}/restore`);
  },

  permanentlyDeleteUser: async (id) => {
    return await api.delete(`/users/${id}/permanent`);
  },

  resetUserPassword: async (id, newPassword) => {
    return await api.put(`/users/${id}/reset-password`, { newPassword });
  },

  assignRole: async (id, role) => {
    return await api.put(`/users/${id}/role`, { role });
  },

  assignPermissions: async (id, permissions) => {
    return await api.put(`/users/${id}/permissions`, { permissions });
  },
};

export default userService;
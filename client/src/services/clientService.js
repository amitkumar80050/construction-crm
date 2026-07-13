import api from './api';

const clientService = {
  getClients: async (params) => {
    return await api.get('/clients', { params });
  },

  getClient: async (id) => {
    return await api.get(`/clients/${id}`);
  },

  createClient: async (data) => {
    return await api.post('/clients', data);
  },

  updateClient: async (id, data) => {
    return await api.put(`/clients/${id}`, data);
  },

  deleteClient: async (id) => {
    return await api.delete(`/clients/${id}`);
  },

  getClientStats: async () => {
    const response = await api.get('/clients/stats');
    return response.data;
  },
};

export default clientService;
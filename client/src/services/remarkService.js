import api from './api';

const remarkService = {
  getAllRemarks: async (params) => {
    return await api.get('/remarks', { params });
  },

  getRemarksByClient: async (clientId) => {
    return await api.get(`/remarks/client/${clientId}`);
  },

  createRemark: async (data) => {
    return await api.post('/remarks', data);
  },

  updateRemark: async (id, data) => {
    return await api.put(`/remarks/${id}`, data);
  },

  deleteRemark: async (id) => {
    return await api.delete(`/remarks/${id}`);
  },
};

export default remarkService;
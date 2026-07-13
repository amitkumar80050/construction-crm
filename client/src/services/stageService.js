import api from './api';

const stageService = {
  getStages: async () => {
    return await api.get('/stages');
  },

  getStage: async (id) => {
    return await api.get(`/stages/${id}`);
  },

  createStage: async (data) => {
    return await api.post('/stages', data);
  },

  updateStage: async (id, data) => {
    return await api.put(`/stages/${id}`, data);
  },

  deleteStage: async (id) => {
    return await api.delete(`/stages/${id}`);
  },

  updateClientStage: async (clientId, stageId) => {
    return await api.put(`/stages/client/${clientId}`, { stageId });
  },

  getClientStageHistory: async (clientId) => {
    return await api.get(`/stages/history/${clientId}`);
  },
};

export default stageService;
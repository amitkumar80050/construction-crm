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

  updateLeadstage: async (LeadId, stagePayload) => {
    const body = typeof stagePayload === 'string' ? { stageId: stagePayload } : stagePayload;
    return await api.put(`/stages/Lead/${LeadId}`, body);
  },

  getLeadstageHistory: async (LeadId) => {
    return await api.get(`/stages/history/${LeadId}`);
  },
};

export default stageService;
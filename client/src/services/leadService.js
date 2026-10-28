import api from './api';

const leadService = {
  getLeads: (params) => api.get('/leads', { params }),
  getMyLeads: (params) => api.get('/leads', { params }),
  getTeamMembers: () => api.get('/auth/users'),
  getLead: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  updateStage: (id, payload) => api.patch(`/leads/${id}/stage`, payload),
  addNote: (leadId, content) => api.post(`/leads/${leadId}/notes`, { content, type: 'call' }),
  distribute: (teamId) => api.post('/leads/distribute', { teamId }),
  distributeLeads: (data) => api.post('/leads/distribute', data),
  reassign: (leadId, userId) => api.put(`/leads/${leadId}`, { assignedTo: userId }),
  getLeadstats: async () => {
    const response = await api.get('/leads/stats');
    return response.data;
  },
};

export default leadService;
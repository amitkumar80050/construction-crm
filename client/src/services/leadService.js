import api from './api';

const leadService = {
  getMyLeads: (params) => api.get('/leads', { params }),
  getTeamMembers: () => api.get('/auth/users'),
  getLead: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateStage: (id, payload) => api.patch(`/leads/${id}/stage`, payload),
  addNote: (leadId, content) => api.post(`/leads/${leadId}/notes`, { content, type: 'call' }),
  distribute: (teamId) => api.post('/leads/distribute', { teamId }),
  reassign: (leadId, userId) => api.put(`/leads/${leadId}`, { assignedTo: userId }),
};

export default leadService;
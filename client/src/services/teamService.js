import api from './api';

const teamService = {
  getTeams: () => api.get('/teams'),
  getTeam: (teamId) => api.get(`/teams/${teamId}`),
  createTeam: (data) => api.post('/teams', data),
  updateTeam: (teamId, data) => api.patch(`/teams/${teamId}`, data),
  deleteTeam: (teamId) => api.delete(`/teams/${teamId}`),
  addMember: (teamId, userId) => api.post(`/teams/${teamId}/members`, { userId }),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
};

export default teamService;
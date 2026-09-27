import api from './api';

const siteVisitService = {
  getMyVisits: (status) => api.get('/site-visits/my', { params: status ? { status } : {} }),
  getVisit: (id) => api.get(`/site-visits/${id}`),
  completeVisit: (id, formData) => api.post(`/site-visits/${id}/complete`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  markNotDone: (id, data) => api.post(`/site-visits/${id}/not-done`, data),
  notDone: (id, data) => api.post(`/site-visits/${id}/not-done`, data),
};
export default siteVisitService;
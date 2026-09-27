import api from './api';

const siteVisitService = {
  getMyVisits: (statusOrParams) => api.get('/site-visits/my', { params: typeof statusOrParams === 'string' ? { status: statusOrParams } : statusOrParams || {} }),
  getVisit: (id) => api.get(`/site-visits/${id}`),
  completeVisit: (id, formData) => api.post(`/site-visits/${id}/complete`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  markNotDone: (id, data) => api.post(`/site-visits/${id}/not-done`, data),
  notDone: (id, data) => api.post(`/site-visits/${id}/not-done`, data),
  getAllSiteVisits: async (params) => {
    const res = await api.get('/site-visits', { params });
    return res.data;
  },
  getSiteVisit: async (id) => {
    const res = await api.get(`/site-visits/${id}`);
    return res.data;
  },
  completeSiteVisit: async (id, formData) => {
    const res = await api.post(`/site-visits/${id}/complete`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  markSiteVisitNotDone: async (id, data) => {
    const res = await api.post(`/site-visits/${id}/not-done`, data);
    return res.data;
  },
  createSiteVisit: async (data) => {
    const res = await api.post('/manager/assign-visit', {
      leadId: data.leadId || data.clientId,
      executiveId: data.executiveId,
      scheduledAt: data.scheduledAt,
      address: data.address,
      priority: data.priority,
      notes: data.notes,
    });
    return res.data;
  },
};

export default siteVisitService;

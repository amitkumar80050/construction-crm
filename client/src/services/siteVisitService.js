import api from './api';

const siteVisitService = {
  createSiteVisit: async (data) => {
    const res = await api.post('/site-visits', data);
    return res.data;
  },

  getMyVisits: async (params) => {
    const res = await api.get('/site-visits/my', { params });
    return res.data;
  },

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
    const res = await api.post(`/site-visits/${id}/notdone`, data);
    return res.data;
  },
};

export default siteVisitService;

import api from './api';

const whatsappService = {
  init: () => api.post('/whatsapp/init'),
  getStatus: () => api.get('/whatsapp/status'),
  logout: () => api.post('/whatsapp/logout'),
  sendMessage: (phone, body) => api.post('/whatsapp/send', { phone, body }),
  getMessagesByLead: (LeadId) => api.get(`/whatsapp/messages/${LeadId}`),
};

export default whatsappService;
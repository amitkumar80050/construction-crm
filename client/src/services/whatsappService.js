import api from './api';

const whatsappService = {
  init: () => api.post('/whatsapp/init'),
  getStatus: () => api.get('/whatsapp/status'),
  logout: () => api.post('/whatsapp/logout'),
  sendMessage: (phone, body) => api.post('/whatsapp/send', { phone, body }),
  getMessagesByClient: (clientId) => api.get(`/whatsapp/messages/${clientId}`),
};

export default whatsappService;
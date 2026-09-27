import api from './api';

const managerService = {
  getManagerDashboard: async () => {
    const res = await api.get('/manager/dashboard');
    return res.data;
  },
};

export default managerService;

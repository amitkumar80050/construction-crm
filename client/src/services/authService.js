import api from './api';

const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await api.put(`/auth/reset-password/${token}`, { password });
    return response.data;
  },

  updateProfile: async (data) => {
  return await api.put('/auth/update-profile', data);
},

changePassword: async (data) => {
  return await api.put('/auth/change-password', data);
},

verifyUserOtp: async (userId, otp) => {
  return await api.post('/auth/verify-user-otp', { userId, otp });
},
resendUserOtp: async (userId) => {
  return await api.post('/auth/resend-user-otp', { userId });
},

};

export default authService;
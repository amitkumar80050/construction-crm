import api from './api';

const otpService = {
  verifyOtp: async (preAuthToken, otp) => {
    return await api.post('/auth/verify-otp', { preAuthToken, otp });
  },
  resendOtp: async (preAuthToken) => {
    return await api.post('/auth/resend-otp', { preAuthToken });
  },
};

export default otpService;
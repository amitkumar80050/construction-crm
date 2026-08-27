import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token && handleOAuthToken) {
      handleOAuthToken(token).then((result) => {
        navigate(result?.success ? '/dashboard' : '/login?error=oauth_failed');
      });
    } else {
      navigate('/login?error=oauth_failed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
      Signing you in...
    </div>
  );
};

export default OAuthSuccess;
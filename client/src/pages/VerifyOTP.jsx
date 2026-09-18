import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import otpService from '../services/otpService';
import { useAuth } from '../hooks/useAuth';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthToken } = useAuth();

  const preAuthToken = searchParams.get('preAuthToken');
  const email = searchParams.get('email');
  const initialExpiry = parseInt(searchParams.get('expiresIn')) || 300;

  const [digits, setDigits] = useState(new Array(6).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialExpiry);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!preAuthToken) {
      navigate('/login?error=missing_session');
    }
  }, [preAuthToken, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const res = await otpService.verifyOtp(preAuthToken, otp);
      const { token } = res.data;
      const result = await handleOAuthToken(token);
      if (result.success) {
        navigate('/dashboard');
      } else {
        navigate('/login?error=session_failed');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid or expired verification code.';
      toast.error(message);
      setDigits(new Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await otpService.resendOtp(preAuthToken);
      toast.success('A new code has been sent to your email.');
      setSecondsLeft(res.data.expiresInSeconds || initialExpiry);
      setDigits(new Array(6).fill(''));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      background: 'white', padding: '40px', borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxWidth: '420px', width: '100%'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', color: '#1e293b' }}>🔐 Verify Your Identity</h1>
        <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>
          Enter the 6-digit verification code sent to<br />
          <strong>{email || 'your registered email'}</strong>
        </p>
      </div>

      <form onSubmit={handleVerify}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: '44px', height: '52px', textAlign: 'center', fontSize: '20px',
                fontWeight: 600, border: '1px solid #ddd', borderRadius: '8px'
              }}
            />
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: secondsLeft > 0 ? '#64748b' : '#ef4444', marginBottom: '20px' }}>
          {secondsLeft > 0 ? `Code expires in ${formatTime(secondsLeft)}` : 'Code expired — please resend'}
        </p>

        <button
          type="submit"
          disabled={verifying || secondsLeft <= 0}
          style={{
            width: '100%', padding: '12px', background: (verifying || secondsLeft <= 0) ? '#93c5fd' : '#2563eb',
            color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600',
            cursor: (verifying || secondsLeft <= 0) ? 'not-allowed' : 'pointer'
          }}
        >
          {verifying ? 'Verifying...' : 'Verify Code'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '18px' }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: resending ? 'not-allowed' : 'pointer', fontSize: '14px' }}
          >
            {resending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VerifyOTP;
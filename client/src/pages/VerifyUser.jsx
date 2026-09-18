import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';

const VerifyUser = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userIdInput, setUserIdInput] = useState(searchParams.get('userId') || '');
  const [digits, setDigits] = useState(new Array(6).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (secondsLeft <= 0 || verified) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, verified]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleDigitChange = (i, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    if (value && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!userIdInput.trim()) {
      toast.error('Please enter your User ID or email');
      return;
    }
    const otp = digits.join('');
    if (otp.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      await authService.verifyUserOtp(userIdInput.trim(), otp);
      setVerified(true);
      toast.success('Account verified successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
      setDigits(new Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!userIdInput.trim()) {
      toast.error('Please enter your User ID or email first');
      return;
    }
    setResending(true);
    try {
      const res = await authService.resendUserOtp(userIdInput.trim());
      toast.success('A new OTP has been sent to your email.');
      setSecondsLeft(res.data.expiresInSeconds || 300);
      setDigits(new Array(6).fill(''));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', color: '#16a34a' }}>✅ Account Verified!</h1>
        <p style={{ color: '#64748b', margin: '12px 0' }}>User ID: <strong>{userIdInput}</strong></p>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>Your BuildFlow CRM account is now active.</p>
        <button
          onClick={() => navigate('/login')}
          style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxWidth: '420px', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', color: '#1e293b' }}>Verify Your Account</h1>
      </div>

      <form onSubmit={handleVerify}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1e293b' }}>User ID / Email</label>
          <input
            type="text"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="CON-00027 or your email"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>

        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1e293b' }}>OTP</label>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
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
              style={{ width: '44px', height: '52px', textAlign: 'center', fontSize: '20px', fontWeight: 600, border: '1px solid #ddd', borderRadius: '8px' }}
            />
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: secondsLeft > 0 ? '#64748b' : '#ef4444', marginBottom: '20px' }}>
          {secondsLeft > 0 ? `OTP expires in: ${formatTime(secondsLeft)}` : 'OTP expired — please resend'}
        </p>

        <button
          type="submit"
          disabled={verifying}
          style={{ width: '100%', padding: '12px', background: verifying ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: verifying ? 'not-allowed' : 'pointer' }}
        >
          {verifying ? 'Verifying...' : 'Verify Account'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <span style={{ color: '#64748b', fontSize: '13px' }}>Didn't receive OTP? </span>
          <button type="button" onClick={handleResend} disabled={resending} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: resending ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VerifyUser;
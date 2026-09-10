import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Mail, Clock, RefreshCw, AlertCircle, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function OtpVerificationView({
  email,
  onSuccess,
  onBackToRegister,
  purpose = 'REGISTER'
}) {
  const { login } = useAuth();
  const { showToast } = useNotification();

  // 6 separate digit slots
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  // Timers & States
  const [expirySeconds, setExpirySeconds] = useState(300); // 5 minutes (300s)
  const [resendCooldown, setResendCooldown] = useState(60);  // 60s cooldown for resend
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-focus first box on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Expiry Countdown (5 minutes)
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  // Resend Cooldown (60 seconds)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Format seconds to MM:SS
  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle individual digit input
  const handleDigitChange = (index, value) => {
    setErrorMessage('');

    // Handle single character typed
    const cleanChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);

    // Auto-advance focus to next input
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits filled, auto-verify
    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      triggerVerification(fullCode);
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle pasting full 6-digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (pastedData.length === 6) {
      triggerVerification(pastedData);
    }
  };

  // Trigger Verify Call
  const triggerVerification = async (codeToVerify) => {
    const code = codeToVerify || digits.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code.');
      return;
    }

    if (expirySeconds <= 0) {
      setErrorMessage('Verification code has expired. Please click "Resend Code".');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: code,
          purpose
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed. Please try again.');
      }

      setSuccessMessage('🎉 Email verified successfully! Welcome to BookBridge.');
      showToast('🎉 Your student account has been verified!', 'success', 'Registration Complete');

      if (data.token && data.user) {
        login(data.token, data.user);
      }

      setTimeout(() => {
        if (onSuccess) onSuccess(data);
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Resend Call
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Could not resend verification code.');
      }

      // Reset digits, timers
      setDigits(['', '', '', '', '', '']);
      setExpirySeconds(300); // Fresh 5 minutes
      setResendCooldown(60); // 60s cooldown
      setSuccessMessage('A fresh 6-digit verification code has been sent to your email.');
      showToast('A fresh verification code was sent to your email.', 'info', 'Code Resent');

      inputRefs.current[0]?.focus();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const isExpired = expirySeconds <= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {/* Icon Badge */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#ECFDF5',
          border: '2px solid #A7F3D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#065F46',
          marginBottom: '1rem',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
        }}
      >
        <Mail size={26} />
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.45rem',
          fontWeight: 800,
          color: 'var(--forest-950)',
          marginBottom: '0.35rem'
        }}
      >
        Verify Your Student Email
      </h2>

      <p style={{ fontSize: '0.825rem', color: 'var(--charcoal-600)', marginBottom: '1.25rem', maxWidth: '340px', lineHeight: 1.5 }}>
        We've sent a 6-digit verification code to{' '}
        <strong style={{ color: 'var(--forest-900)', wordBreak: 'break-all' }}>{email}</strong>.
      </p>

      {/* Expiry Banner */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: isExpired ? '#FEF2F2' : '#F3ECE1',
          border: `1px solid ${isExpired ? '#FECACA' : '#E6DAC8'}`,
          fontSize: '0.775rem',
          fontWeight: 700,
          color: isExpired ? '#991B1B' : 'var(--forest-800)',
          marginBottom: '1.25rem'
        }}
      >
        <Clock size={14} />
        {isExpired ? 'Code expired' : `Code expires in: ${formatTimer(expirySeconds)}`}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            marginBottom: '1.25rem',
            color: '#991B1B',
            fontSize: '0.825rem',
            textAlign: 'left'
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            marginBottom: '1.25rem',
            color: '#065F46',
            fontSize: '0.825rem',
            textAlign: 'left'
          }}
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 6-Digit OTP Boxes */}
      <div
        onPaste={handlePaste}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '0.45rem',
          width: '100%',
          maxWidth: '340px',
          marginBottom: '1.5rem'
        }}
      >
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            disabled={loading}
            style={{
              height: '52px',
              textAlign: 'center',
              fontSize: '1.35rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              borderRadius: 'var(--radius-sm)',
              border: digit ? '2px solid var(--forest-700)' : '1px solid var(--border-light)',
              backgroundColor: digit ? '#FFFFFF' : '#FAF7F2',
              color: 'var(--forest-950)',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              boxShadow: digit ? '0 2px 6px rgba(26, 56, 38, 0.08)' : 'none'
            }}
          />
        ))}
      </div>

      {/* Verify Button */}
      <button
        type="button"
        disabled={loading || digits.join('').length !== 6 || isExpired}
        onClick={() => triggerVerification()}
        className="btn btn-forest"
        style={{
          width: '100%',
          padding: '0.8rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          opacity: (loading || digits.join('').length !== 6 || isExpired) ? 0.6 : 1,
          cursor: (loading || digits.join('').length !== 6 || isExpired) ? 'not-allowed' : 'pointer'
        }}
      >
        <ShieldCheck size={18} />
        {loading ? 'Verifying Code...' : 'Verify OTP & Activate Account'}
      </button>

      {/* Resend OTP Section */}
      <div style={{ fontSize: '0.825rem', color: 'var(--charcoal-600)', marginBottom: '1.25rem' }}>
        Didn't receive the email?{' '}
        {resendCooldown > 0 ? (
          <span style={{ fontWeight: 700, color: 'var(--charcoal-400)' }}>
            Resend in {resendCooldown}s
          </span>
        ) : (
          <button
            type="button"
            disabled={resending}
            onClick={handleResendOtp}
            style={{
              color: 'var(--forest-800)',
              fontWeight: 700,
              cursor: resending ? 'wait' : 'pointer',
              border: 'none',
              background: 'none',
              padding: 0,
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <RefreshCw size={12} className={resending ? 'spin' : ''} />
            {resending ? 'Sending...' : 'Resend Code'}
          </button>
        )}
      </div>

      {/* Back to Edit Registration */}
      {onBackToRegister && (
        <button
          type="button"
          onClick={onBackToRegister}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--charcoal-500)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <ArrowLeft size={14} /> Edit registration details
        </button>
      )}
    </div>
  );
}

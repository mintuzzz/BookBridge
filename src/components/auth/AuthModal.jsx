import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { X, Lock, Mail, User, ShieldCheck, BookOpen, KeyRound, RefreshCw } from 'lucide-react';

export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode); // 'login', 'register', 'otp', 'forgot', 'reset_password'
  const { login } = useAuth();
  const { showToast } = useNotification();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [institution, setInstitution] = useState('State University of Technology');
  const [department, setDepartment] = useState('Computer Science');
  const [semester, setSemester] = useState('3');
  const [newPassword, setNewPassword] = useState('');

  // 6-Digit PIN OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  
  // Resend Timer State (60s cooldown)
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState('REGISTER');

  // Cooldown Countdown Timer Effect
  useEffect(() => {
    let timer = null;
    if (mode === 'otp' && resendCooldown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (resendCooldown === 0) {
      setCanResend(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, resendCooldown]);

  // Handle 6-Digit OTP Box Change & Auto-Focus
  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1); // Take last entered digit
    setOtpDigits(newDigits);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  // Handle Backspace Key Navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // Handle Pasting Full 6-Digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      inputRefs[5].current?.focus();
    }
  };

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 35000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Server request timed out. The backend took too long to wake up or respond. Please try again.');
      }
      throw err;
    }
  };

  // Submit Login (Student or Admin authenticated via /api/auth/login)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Login Error');

      login(data.token, data.user);
      showToast(`Welcome back, ${data.user.full_name}!`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message, 'error', 'Login Error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Registration (Bypasses OTP, logs user in directly)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          password,
          institution,
          department,
          semester
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Registration Error');

      if (data.token && data.user) {
        login(data.token, data.user);
        showToast(`Account created successfully! Welcome to BookBridge, ${data.user.full_name}!`, 'success', '🎉 Welcome');
        onClose();
      } else {
        showToast(data.message || 'Account created successfully! Please log in.', 'success');
        setMode('login');
      }
    } catch (err) {
      showToast(err.message, 'error', 'Registration Error');
    } finally {
      setLoading(false);
    }
  };

  // Submit OTP Verification Step 2
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      showToast('Please enter the complete 6-digit verification code.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: fullOtp,
          purpose: otpPurpose
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Verification failed');

      if (otpPurpose === 'PASSWORD_RESET') {
        showToast('Code verified! Set your new password.', 'success');
        setMode('reset_password');
      } else {
        login(data.token, data.user);
        showToast('Account verified & created successfully!', 'success', '🎉 Welcome to BookBridge');
        onClose();
      }
    } catch (err) {
      showToast(err.message, 'error', 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  // Resend Real Email OTP via Gmail SMTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          purpose: otpPurpose
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Resend Error');

      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      setCanResend(false);
      showToast('A new 6-digit code has been sent to your email.', 'success', 'Code Resent');
    } catch (err) {
      showToast(err.message, 'error', 'Resend Error');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Request
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Request Failed');

      setOtpPurpose('PASSWORD_RESET');
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      setCanResend(false);
      setMode('otp');
      showToast(`Password reset code sent to ${email}`, 'info');
    } catch (err) {
      showToast(err.message, 'error', 'Request Failed');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Final Submit
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: otpDigits.join(''),
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Reset Failed');

      showToast('Password updated successfully! Please log in with your new password.', 'success');
      setMode('login');
    } catch (err) {
      showToast(err.message, 'error', 'Reset Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '440px' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #2563eb 100%)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            <BookOpen size={26} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {mode === 'login' && 'Welcome to BookBridge'}
            {mode === 'register' && 'Create Student Account'}
            {mode === 'otp' && 'Verify Your Email'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset_password' && 'Set New Password'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {mode === 'login' && 'One account for buying, selling, exchanging & donating books.'}
            {mode === 'register' && 'Join your campus student book community.'}
            {mode === 'otp' && `Enter the 6-digit verification code sent to your email.`}
            {mode === 'forgot' && 'Enter your registered student email address.'}
            {mode === 'reset_password' && 'Choose a secure new password for your account.'}
          </p>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px', display: 'block' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="alex.smith@student.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.4rem', borderRadius: '10px', border: '1px solid var(--border-light)', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-dark)' }}>Password</label>
                <button type="button" onClick={() => setMode('forgot')} style={{ fontSize: '0.75rem', color: 'var(--blue-600)', fontWeight: 600 }}>Forgot password?</button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.4rem', borderRadius: '10px', border: '1px solid var(--border-light)', outline: 'none' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-emerald btn-lg" style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Authenticating...' : 'Sign In to Account'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Don't have an account yet?{' '}
              <button type="button" onClick={() => setMode('register')} style={{ color: 'var(--emerald-600)', fontWeight: 700 }}>
                Register here
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Full Name *</label>
              <input
                type="text"
                required
                placeholder="Alex Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Student Email *</label>
                <input
                  type="email"
                  required
                  placeholder="alex@student.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Management">Management</option>
                  <option value="Arts">Arts</option>
                  <option value="Science">Science</option>
                  <option value="Law">Law</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Semester *</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Sem {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Password *</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-emerald btn-lg" style={{ width: '100%', marginTop: '0.4rem' }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <button type="button" onClick={() => setMode('login')} style={{ color: 'var(--emerald-600)', fontWeight: 700 }}>
                Log in
              </button>
            </div>
          </form>
        )}

        {/* REAL EMAIL OTP VERIFICATION FORM (6 PIN BOXES) */}
        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
            <div style={{ backgroundColor: 'var(--emerald-50)', border: '1px solid var(--emerald-200)', borderRadius: '12px', padding: '0.85rem', fontSize: '0.825rem', color: 'var(--emerald-800)' }}>
              ✉️ We sent a 6-digit code to <strong>{email}</strong>.<br />Please check your email inbox (and spam folder).
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '12px', color: 'var(--text-dark)' }}>
                Enter the 6-digit verification code
              </label>

              {/* 6 Individual PIN Input Boxes */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    style={{
                      width: '42px',
                      height: '52px',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      borderRadius: '10px',
                      border: digit ? '2px solid var(--emerald-500)' : '1px solid var(--border-light)',
                      backgroundColor: digit ? '#f0fdf4' : 'white',
                      outline: 'none',
                      boxShadow: digit ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="btn btn-emerald btn-lg"
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading ? 'Verifying Code...' : 'Verify & Create Account'}
            </button>

            {/* Resend OTP with 60s Countdown Timer */}
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span>Didn't receive the code?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{
                    color: 'var(--emerald-600)',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} /> Resend OTP
                </button>
              ) : (
                <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                  Resend OTP in <strong style={{ color: 'var(--emerald-600)' }}>{resendCooldown}s</strong>
                </span>
              )}
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Your Registered Student Email</label>
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="alex.smith@student.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.4rem', borderRadius: '10px', border: '1px solid var(--border-light)', outline: 'none' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-blue btn-lg" style={{ width: '100%' }}>
              {loading ? 'Sending Code...' : 'Send Password Reset Code'}
            </button>

            <button type="button" onClick={() => setMode('login')} style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Back to Login
            </button>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {mode === 'reset_password' && (
          <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enter New Password</label>
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.4rem', borderRadius: '10px', border: '1px solid var(--border-light)', outline: 'none' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-emerald btn-lg" style={{ width: '100%' }}>
              {loading ? 'Updating Password...' : 'Save New Password & Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

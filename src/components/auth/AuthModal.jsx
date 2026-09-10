import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { X, Lock, Mail, User, Phone, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';
import OtpVerificationView from './OtpVerificationView';

export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot' | 'otp'
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
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [showVerifyLink, setShowVerifyLink] = useState(false);

  const clearErrors = () => {
    setErrorMessage('');
    setShowVerifyLink(false);
  };

  // Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPassword = (password || '');

    if (!cleanEmail || !cleanPassword || cleanPassword.trim().length === 0) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.unverified) {
          setOtpEmail(cleanEmail);
          setErrorMessage(data.message || 'Please verify your email address before logging in.');
          setShowVerifyLink(true);
          return;
        }
        throw new Error(data.message || data.error || 'Invalid email or password.');
      }

      if (!data.token || !data.user) {
        throw new Error('Authentication response was invalid. Please try again.');
      }

      // Successful verification
      login(data.token, data.user);
      showToast(`Welcome back, ${data.user.full_name || 'Scholar'}!`, 'success');
      if (onClose) onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Registration (Dispatches Real Email OTP)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    const cleanFullName = (fullName || '').trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPhone = (phone || '').trim();
    const cleanPassword = (password || '');

    if (!cleanFullName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid student email address.');
      return;
    }

    if (!cleanPhone) {
      setErrorMessage('Please enter your phone number for campus pickup coordination.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: cleanFullName,
          email: cleanEmail,
          phone: cleanPhone,
          password: cleanPassword,
          institution: institution.trim(),
          department: department.trim(),
          semester: parseInt(semester, 10) || 1
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Registration could not be completed.');
      }

      // Transition to OTP verification screen
      setOtpEmail(cleanEmail);
      showToast('A 6-digit verification code has been sent to your email.', 'info', 'Check Your Inbox');
      setMode('otp');
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '440px',
          padding: '2.25rem 2rem',
          backgroundColor: '#FAF7F2',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--charcoal-600)',
            cursor: 'pointer'
          }}
          title="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Modal Header & Switcher Tabs (Hidden during OTP step) */}
        {mode !== 'otp' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--forest-800)',
                  color: 'var(--gold-500)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.85rem',
                  boxShadow: '0 4px 12px rgba(26, 56, 38, 0.25)',
                  border: '1px solid rgba(216, 160, 56, 0.25)'
                }}
              >
                <BookOpen size={24} />
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--forest-950)',
                  marginBottom: '0.35rem'
                }}
              >
                {mode === 'login' && 'Sign In to BookBridge'}
                {mode === 'register' && 'Join the Campus Bridge'}
                {mode === 'forgot' && 'Reset Password'}
              </h2>

              <p style={{ fontSize: '0.825rem', color: 'var(--charcoal-600)' }}>
                {mode === 'login' && 'Your account for buying, exchanging & donating textbooks.'}
                {mode === 'register' && 'Connect with verified students at your campus.'}
                {mode === 'forgot' && 'Enter your registered email address to recover access.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            {mode !== 'forgot' && (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '3px',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '1.5rem',
                  border: '1px solid var(--border-light)'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    clearErrors();
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    backgroundColor: mode === 'login' ? '#FFFFFF' : 'transparent',
                    color: mode === 'login' ? 'var(--forest-900)' : 'var(--charcoal-500)',
                    boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    clearErrors();
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    backgroundColor: mode === 'register' ? '#FFFFFF' : 'transparent',
                    color: mode === 'register' ? 'var(--forest-900)' : 'var(--charcoal-500)',
                    boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Register
                </button>
              </div>
            )}
          </>
        )}

        {/* Error Banner */}
        {errorMessage && mode !== 'otp' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              marginBottom: '1.25rem',
              color: '#991B1B',
              fontSize: '0.825rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
            {showVerifyLink && (
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setMode('otp');
                }}
                style={{
                  color: 'var(--forest-800)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  marginTop: '3px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Click here to verify code & activate account <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}

        {/* OTP VERIFICATION STEP */}
        {mode === 'otp' && (
          <OtpVerificationView
            email={otpEmail || email}
            onSuccess={() => {
              if (onClose) onClose();
            }}
            onBackToRegister={() => {
              clearErrors();
              setMode('register');
            }}
            purpose="REGISTER"
          />
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--charcoal-800)', marginBottom: '4px', display: 'block' }}>
                Student Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--charcoal-400)' }}
                />
                <input
                  type="email"
                  required
                  placeholder="alex.smith@student.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearErrors();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem 0.65rem 2.4rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--charcoal-800)' }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--charcoal-400)' }}
                />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearErrors();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem 0.65rem 2.4rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-forest"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.825rem', color: 'var(--charcoal-500)', marginTop: '0.5rem' }}>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  clearErrors();
                }}
                style={{ color: 'var(--forest-800)', fontWeight: 700 }}
              >
                Register here
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--charcoal-800)', display: 'block', marginBottom: '3px' }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--charcoal-400)' }} />
                <input
                  type="text"
                  required
                  placeholder="Alex Smith"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearErrors();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--charcoal-800)', display: 'block', marginBottom: '3px' }}>
                  Student Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@student.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearErrors();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--charcoal-800)', display: 'block', marginBottom: '3px' }}>
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearErrors();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--charcoal-800)', display: 'block', marginBottom: '3px' }}>
                  Faculty / Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF'
                  }}
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
                <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--charcoal-800)', display: 'block', marginBottom: '3px' }}>
                  Semester *
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Sem {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--charcoal-800)', display: 'block', marginBottom: '3px' }}>
                Password * (min. 6 characters)
              </label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearErrors();
                }}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-forest"
              style={{ width: '100%', marginTop: '0.4rem', padding: '0.75rem' }}
            >
              {loading ? 'Creating Account...' : 'Create Student Account'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.825rem', color: 'var(--charcoal-500)' }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearErrors();
                }}
                style={{ color: 'var(--forest-800)', fontWeight: 700 }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

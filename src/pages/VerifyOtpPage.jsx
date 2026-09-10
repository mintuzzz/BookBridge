import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import OtpVerificationView from '../components/auth/OtpVerificationView';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';

  const handleSuccess = (data) => {
    navigate('/browse');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem 2rem',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--forest-900)',
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 800,
              textDecoration: 'none'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--forest-800)',
                color: 'var(--gold-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BookOpen size={18} />
            </div>
            <span>BookBridge</span>
          </Link>
        </div>

        <OtpVerificationView
          email={email}
          onSuccess={handleSuccess}
          onBackToRegister={handleBack}
          purpose="REGISTER"
        />
      </div>
    </div>
  );
}

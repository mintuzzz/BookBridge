import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, BookOpen } from 'lucide-react';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          backgroundColor: 'var(--bg-cream, #faf7f2)',
          color: 'var(--forest-900, #1a3826)'
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid rgba(26, 56, 38, 0.15)',
            borderTopColor: 'var(--forest-700, #234e34)',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--charcoal-600, #57534e)' }}>
          Verifying campus session...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location, openAuth: true }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div style={{ minHeight: '60vh', padding: '4rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <ShieldAlert size={48} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            This panel is reserved exclusively for BookBridge platform administrators.
          </p>
          <a href="/" className="btn btn-emerald" style={{ width: '100%' }}>
            Return to Marketplace
          </a>
        </div>
      </div>
    );
  }

  return children;
}

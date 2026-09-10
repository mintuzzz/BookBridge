import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Leaf, Shield, Heart, Repeat, Gift } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--forest-950, #0b1910)',
        color: '#E8E2D8',
        borderTop: '1px solid rgba(216, 160, 56, 0.2)',
        marginTop: '5rem',
        padding: '4.5rem 0 2.5rem'
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '3rem',
            marginBottom: '3.5rem'
          }}
        >
          {/* Brand & Purpose Column */}
          <div style={{ maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--forest-800)',
                  border: '1px solid var(--gold-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-500)'
                }}
              >
                <BookOpen size={20} />
              </div>
              <span
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-serif)',
                  color: '#FAF7F2'
                }}
              >
                Book<span style={{ color: 'var(--gold-500)' }}>Bridge</span>
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#B5ADA2', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              The campus bookstore reimagined as a peer-to-peer exchange. Connecting students across departments to save money, keep books in circulation, and foster sustainable learning.
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(216, 160, 56, 0.12)',
                border: '1px solid rgba(216, 160, 56, 0.3)',
                color: 'var(--gold-500)',
                fontSize: '0.775rem',
                fontWeight: 600
              }}
            >
              <Leaf size={14} /> 100% Student-to-Student Campus Circularity
            </div>
          </div>

          {/* Navigation / Marketplace */}
          <div>
            <h4
              style={{
                fontSize: '0.925rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                color: '#FAF7F2',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Explore Books
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#B5ADA2' }}>
              <Link to="/browse" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                All Available Textbooks
              </Link>
              <Link to="/exchanges" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                Peer Book Exchange
              </Link>
              <Link to="/donations" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                Free Senior Book Donations
              </Link>
              <Link to="/requests" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                Wanted Books Board
              </Link>
              <Link to="/sell" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                List Your Books
              </Link>
            </div>
          </div>

          {/* Academic Faculties */}
          <div>
            <h4
              style={{
                fontSize: '0.925rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                color: '#FAF7F2',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Faculties
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#B5ADA2' }}>
              <Link to="/browse?department=Computer%20Science" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                Computer Science & IT
              </Link>
              <Link to="/browse?department=Engineering" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                Engineering Sciences
              </Link>
              <Link to="/browse?department=Medicine" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                Medical & Pharmacy
              </Link>
              <Link to="/browse?department=Commerce" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                Commerce & Economics
              </Link>
              <Link to="/browse?department=Management" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.target.style.color = '#B5ADA2')}>
                Management & MBA
              </Link>
            </div>
          </div>

          {/* Safety & Protocol */}
          <div>
            <h4
              style={{
                fontSize: '0.925rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                color: '#FAF7F2',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Campus Trust
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#B5ADA2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={15} color="var(--gold-500)" />
                <span>Verified Campus Handovers</span>
              </div>
              <div>Direct Peer Payment (Cash / UPI)</div>
              <div>Designated Safe Campus Meetups</div>
              <div>Student Peer Reviews & Ratings</div>
              <div>Community Code of Academic Integrity</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.8rem',
            color: '#8C8479'
          }}
        >
          <div>
            © 2026 BookBridge. <span style={{ color: 'var(--gold-500)', fontStyle: 'italic' }}>"Read. Exchange. Give. Repeat."</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            Built for campus scholars with <Heart size={13} color="var(--gold-500)" fill="var(--gold-500)" />
          </div>
        </div>
      </div>
    </footer>
  );
}

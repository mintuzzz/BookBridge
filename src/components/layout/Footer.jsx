import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Leaf, Shield, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'white', borderTop: '1px solid var(--border-light)', marginTop: '4rem', padding: '3.5rem 0 2rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
          {/* Col 1 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                <BookOpen size={20} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-dark)' }}>
                Book<span style={{ color: 'var(--emerald-600)' }}>Bridge</span>
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              The official campus book exchange, resale & donation platform. Connecting students for affordable education and sustainable book reuse.
            </p>
            <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} className="badge badge-emerald">
              <Leaf size={14} /> 100% Student Powered & Sustainable
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-dark)' }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <Link to="/browse">Browse Books</Link>
              <Link to="/sell">Sell a Book</Link>
              <Link to="/exchanges">Book Exchanges</Link>
              <Link to="/donations">Free Book Donations</Link>
              <Link to="/requests">Wanted Book Board</Link>
            </div>
          </div>

          {/* Col 3 */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-dark)' }}>Student Lifecycle</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <Link to="/browse?department=Computer%20Science">Computer Science</Link>
              <Link to="/browse?department=Engineering">Engineering</Link>
              <Link to="/browse?department=Medicine">Medicine</Link>
              <Link to="/browse?department=Commerce">Commerce & Accounting</Link>
              <Link to="/browse?department=Management">Management / MBA</Link>
            </div>
          </div>

          {/* Col 4 */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-dark)' }}>Trust & Safety</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Shield size={14} color="var(--emerald-600)" /> OTP / QR Campus Verification</div>
              <div>Pay at Pickup (Cash / UPI)</div>
              <div>Student Seller Ratings</div>
              <div>Report Malicious Listings</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
          <div>© 2026 BookBridge Platform. Read. Exchange. Give. Repeat.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Built with <Heart size={14} color="var(--rose-500)" fill="var(--rose-500)" /> for Students
          </div>
        </div>
      </div>
    </footer>
  );
}

import React, { useState, useEffect } from 'react';
import BookCard from '../components/books/BookCard';
import { Gift, Sparkles, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DonatePage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/donations')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDonations(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        {/* Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
            marginBottom: '2.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}
        >
          <div>
            <span className="badge badge-amber" style={{ marginBottom: '0.75rem', padding: '0.35rem 0.75rem' }}>
              <Gift size={14} /> 100% Free Campus Donations
            </span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#78350f' }}>🎁 Pass Down Your Used Books</h1>
            <p style={{ color: '#92400e', fontSize: '0.95rem', maxWidth: '560px', marginTop: '4px' }}>
              Completed your semester? Help junior students in need by donating your textbooks for free. Earn +30 Eco Points!
            </p>
          </div>

          <Link to="/sell" className="btn btn-emerald btn-lg" style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
            <Heart size={18} /> Donate a Free Book
          </Link>
        </div>

        {/* Free Books Feed */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading free donation listings...</div>
        ) : donations.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Gift size={48} color="var(--amber-500)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Free Donations Available Right Now</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Be the first senior student to list a free book for your juniors!</p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>Available Free Books ({donations.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {donations.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

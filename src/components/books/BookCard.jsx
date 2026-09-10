import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Heart, Star, MapPin, Tag, Repeat, Gift, ArrowUpRight, BookOpen } from 'lucide-react';

const resolveImageUrl = (img) => {
  if (!img || typeof img !== 'string') return null;
  const trimmed = img.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export default function BookCard({ book }) {
  const { isAuthenticated, token } = useAuth();
  const { showToast } = useNotification();
  const [isSaved, setIsSaved] = useState(false);

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('Please log in to save books to your wishlist.', 'info');
      return;
    }

    try {
      const activeToken = token || localStorage.getItem('bb_token');
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ book_id: book.id || book._id })
      });
      const data = await res.json();
      setIsSaved(data.saved);
      showToast(data.message, data.saved ? 'success' : 'info');
    } catch {
      showToast('Failed to toggle wishlist.', 'error');
    }
  };

  const rawImage = (book.images && book.images.length > 0) ? book.images[0] : (book.image || book.img || null);
  const mainImage = resolveImageUrl(rawImage);

  const transactionType = book.transaction_type || book.transactionType || 'buy';
  const sellingPrice = book.selling_price !== undefined ? book.selling_price : (book.sellingPrice !== undefined ? book.sellingPrice : 0);
  const originalPrice = book.original_price !== undefined ? book.original_price : (book.originalPrice !== undefined ? book.originalPrice : 0);
  const bookId = book.id || book._id;

  return (
    <div
      className="card book-editorial-card"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Top Book Cover Area */}
      <div
        style={{
          height: '210px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px'
        }}
      >
        <div
          className="book-cover-frame"
          style={{
            width: '135px',
            height: '185px',
            position: 'relative',
            backgroundColor: '#FAF7F2'
          }}
        >
          {mainImage ? (
            <img
              src={mainImage}
              alt={book.title}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              className="card-book-img"
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--forest-50)',
                color: 'var(--forest-800)',
                padding: '0.75rem',
                textAlign: 'center'
              }}
            >
              <BookOpen size={28} strokeWidth={1.75} style={{ marginBottom: '0.35rem', color: 'var(--gold-600)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-serif)', lineHeight: 1.2 }}>
                {book.department || 'Textbook'}
              </span>
            </div>
          )}
        </div>

        {/* Transaction Type Badge */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 3 }}>
          {transactionType === 'donate' ? (
            <span className="badge badge-gold" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Gift size={11} /> Free Gift
            </span>
          ) : transactionType === 'exchange' ? (
            <span className="badge badge-blue" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Repeat size={11} /> Exchange
            </span>
          ) : (
            <span className="badge badge-forest" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Tag size={11} /> Resale
            </span>
          )}
        </div>

        {/* Wishlist Heart Button */}
        <button
          onClick={handleWishlistToggle}
          title="Save to Wishlist"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSaved ? 'var(--rose-500)' : 'var(--charcoal-400)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid rgba(0,0,0,0.06)',
            transition: 'transform 0.15s ease',
            zIndex: 3
          }}
        >
          <Heart size={16} fill={isSaved ? 'var(--rose-500)' : 'none'} strokeWidth={isSaved ? 0 : 2} />
        </button>

        {/* Reserved Tag Overlay */}
        {book.status === 'reserved' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(26, 23, 21, 0.65)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.825rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              zIndex: 4
            }}
          >
            Reserved
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'space-between'
        }}
      >
        <div>
          {/* Faculty / Semester Badges */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: 'var(--charcoal-600)',
                backgroundColor: 'var(--bg-primary)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border-light)'
              }}
            >
              {book.department}
            </span>

            {book.semester && (
              <span
                style={{
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  color: 'var(--charcoal-600)',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-light)'
                }}
              >
                Sem {book.semester}
              </span>
            )}

            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: 'var(--forest-800)',
                backgroundColor: 'var(--forest-50)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--forest-100)'
              }}
            >
              {book.condition || 'Good'}
            </span>
          </div>

          {/* Book Title */}
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.05rem',
              fontWeight: 700,
              lineHeight: 1.35,
              color: 'var(--forest-950)',
              marginBottom: '0.3rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {book.title}
          </h3>

          {/* Author */}
          <p
            style={{
              fontSize: '0.825rem',
              color: 'var(--charcoal-500)',
              marginBottom: '0.85rem',
              fontStyle: 'italic'
            }}
          >
            by {book.author || 'Academic Author'}
          </p>
        </div>

        <div>
          {/* Location & Seller Rating */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: 'var(--charcoal-500)',
              marginBottom: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={12} color="var(--forest-700)" />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '135px' }}>
                {book.location || 'Campus'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, color: 'var(--gold-700)' }}>
              {book.seller_rating > 0 ? (
                <>
                  <Star size={12} fill="var(--gold-500)" stroke="none" />
                  {book.seller_rating}
                </>
              ) : (
                <span style={{ color: 'var(--charcoal-400)', fontSize: '0.7rem' }}>Verified Peer</span>
              )}
            </div>
          </div>

          {/* Price & Action Row */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              {transactionType === 'donate' ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold-700)', fontFamily: 'var(--font-serif)' }}>
                    FREE
                  </span>
                  <span style={{ fontSize: '0.675rem', color: 'var(--charcoal-400)' }}>Donation</span>
                </div>
              ) : transactionType === 'exchange' ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--blue-600)' }}>
                    Exchange
                  </span>
                  <span style={{ fontSize: '0.675rem', color: 'var(--charcoal-400)' }}>Swap Materials</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--forest-900)'
                    }}
                  >
                    ₹{sellingPrice}
                  </span>
                  {originalPrice > sellingPrice && (
                    <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'var(--charcoal-400)' }}>
                      ₹{originalPrice}
                    </span>
                  )}
                </div>
              )}
            </div>

            <Link
              to={`/books/${bookId}`}
              className="btn btn-sm btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
                padding: '0.38rem 0.85rem',
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-light)'
              }}
            >
              Details <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .book-editorial-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
          border-color: var(--gold-500);
        }
        .book-editorial-card:hover .card-book-img {
          transform: scale(1.05);
        }
        .card-book-img {
          transition: transform 0.35s ease;
        }
      `}</style>
    </div>
  );
}

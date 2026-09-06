import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Heart, Star, MapPin, Tag, Repeat, Gift, Eye, BookOpen } from 'lucide-react';

export default function BookCard({ book }) {
  const { isAuthenticated } = useAuth();
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
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({ book_id: book.id })
      });
      const data = await res.json();
      setIsSaved(data.saved);
      showToast(data.message, data.saved ? 'success' : 'info');
    } catch (err) {
      showToast('Failed to toggle wishlist.', 'error');
    }
  };

  const mainImage = book.images && book.images.length > 0 ? book.images[0] : null;

  const transactionType = book.transaction_type || book.transactionType || 'buy';
  const sellingPrice = book.selling_price !== undefined ? book.selling_price : (book.sellingPrice !== undefined ? book.sellingPrice : 0);
  const originalPrice = book.original_price !== undefined ? book.original_price : (book.originalPrice !== undefined ? book.originalPrice : 0);

  return (
    <div
      className="card"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100%'
      }}
    >
      {/* Top Image Banner */}
      <div style={{ height: '190px', width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
        {mainImage ? (
          <img
            src={mainImage}
            alt={book.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
            className="book-card-img"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b' }}>
            <BookOpen size={36} color="var(--emerald-600)" style={{ marginBottom: '0.4rem', opacity: 0.8 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>No Image Available</span>
          </div>
        )}

        {/* Transaction Type Tag */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          {transactionType === 'donate' ? (
            <span className="badge badge-amber" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Gift size={12} /> Free Book
            </span>
          ) : transactionType === 'exchange' ? (
            <span className="badge badge-blue" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Repeat size={12} /> Exchange
            </span>
          ) : (
            <span className="badge badge-emerald" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Tag size={12} /> Resale
            </span>
          )}
        </div>

        {/* Wishlist Button */}
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
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSaved ? 'var(--rose-500)' : 'var(--text-muted)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Heart size={18} fill={isSaved ? 'var(--rose-500)' : 'none'} />
        </button>

        {/* Status Overlay if Reserved */}
        {book.status === 'reserved' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            Reserved
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          {/* Department & Semester Badges */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              {book.department}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Sem {book.semester}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--emerald-700)', backgroundColor: 'var(--emerald-50)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              {book.condition}
            </span>
          </div>

          {/* Book Title */}
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              lineHeight: 1.35,
              color: 'var(--text-dark)',
              marginBottom: '0.35rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {book.title}
          </h3>

          {/* Author */}
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            by {book.author}
          </p>
        </div>

        <div>
          {/* Location & Seller Rating */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={13} color="var(--emerald-600)" />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{book.location}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, color: 'var(--amber-600)' }}>
              {book.seller_rating > 0 ? (
                <>
                  <Star size={13} fill="var(--amber-500)" stroke="none" />
                  {book.seller_rating}
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>New Seller</span>
              )}
            </div>
          </div>

          {/* Price & Action Row */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              {transactionType === 'donate' ? (
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--amber-600)' }}>FREE</span>
              ) : transactionType === 'exchange' ? (
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--blue-600)' }}>Exchange</span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--emerald-600)' }}>₹{sellingPrice}</span>
                  {originalPrice > sellingPrice && (
                    <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'var(--text-light)' }}>
                      ₹{originalPrice}
                    </span>
                  )}
                </div>
              )}
            </div>

            <Link to={`/books/${book.id}`} className="btn btn-sm btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Eye size={14} /> View
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .card:hover .book-card-img {
          transform: scale(1.04);
        }
      `}</style>
    </div>
  );
}

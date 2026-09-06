import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  MapPin,
  Star,
  CheckCircle2,
  Heart,
  ShieldAlert,
  Share2,
  Tag,
  Repeat,
  Gift,
  User,
  ShoppingBag,
  ArrowLeft,
  BookOpen
} from 'lucide-react';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotification();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reserving, setReserving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Book not found');
      })
      .then((data) => setBook(data))
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRequestToBuy = async () => {
    if (!isAuthenticated) {
      showToast('Please log in to send a purchase request.', 'info');
      return;
    }

    setReserving(true);
    try {
      const activeToken = localStorage.getItem('bb_token');
      const res = await fetch('/api/orders/request-to-buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          book_id: book.id,
          payment_method: paymentMethod,
          pickup_notes: `Campus pickup at ${book.location}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send purchase request');

      showToast('🎉 Purchase request sent to seller! Waiting for response.', 'success', 'Request Sent');
      navigate('/orders');
    } catch (err) {
      showToast(err.message, 'error', 'Request Failed');
    } finally {
      setReserving(false);
    }
  };

  const handleReportListing = async () => {
    if (!isAuthenticated) {
      showToast('Please log in to report listings.', 'info');
      return;
    }

    const reason = prompt('Reason for reporting this listing (e.g. Misrepresented Condition, Fake Book):');
    if (!reason) return;

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({
          target_type: 'listing',
          target_id: book.id,
          reason,
          description: 'Reported from book detail page.'
        })
      });
      const data = await res.json();
      showToast(data.message, 'success', 'Report Submitted');
    } catch (err) {
      showToast('Failed to submit report.', 'error');
    }
  };

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading book details...</div>;
  if (!book) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Book listing not found.</div>;

  const currentUserId = user?.id || user?._id;
  const isOwner = currentUserId && currentUserId.toString() === book.seller_id?.toString();
  const isAvailable = book.status === 'available';

  const transactionType = book.transaction_type || book.transactionType || 'buy';
  const sellingPrice = book.selling_price !== undefined ? book.selling_price : (book.sellingPrice !== undefined ? book.sellingPrice : 0);
  const originalPrice = book.original_price !== undefined ? book.original_price : (book.originalPrice !== undefined ? book.originalPrice : 0);

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        {/* Back Link */}
        <Link to="/browse" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Browse
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'start' }}>
          {/* Left Column: Image Gallery */}
          <div>
            <div className="card" style={{ overflow: 'hidden', height: '400px', backgroundColor: 'var(--bg-secondary)', marginBottom: '1rem', position: 'relative' }}>
              {book.images && book.images.length > 0 ? (
                <img
                  src={book.images[activeImageIndex]}
                  alt={book.title}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                  <BookOpen size={64} color="var(--emerald-600)" style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>No Image Available</span>
                </div>
              )}
              <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
                {transactionType === 'donate' ? (
                  <span className="badge badge-amber"><Gift size={14} /> Free Donation</span>
                ) : transactionType === 'exchange' ? (
                  <span className="badge badge-blue"><Repeat size={14} /> Exchange</span>
                ) : (
                  <span className="badge badge-emerald"><Tag size={14} /> Resale</span>
                )}
              </div>
            </div>

            {/* Thumbnail Row */}
            {book.images && book.images.length > 1 && (
              <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto' }}>
                {book.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Thumbnail"
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: activeImageIndex === idx ? '2px solid var(--emerald-500)' : '1px solid var(--border-light)'
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Specifications & CTAs */}
          <div>
            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{book.department}</span>
              <span className="badge badge-emerald">Semester {book.semester}</span>
              <span className="badge badge-amber">{book.condition} Condition</span>
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-dark)' }}>{book.title}</h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>by {book.author}</p>

            {/* Price Box */}
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Listing Price</div>
                {transactionType === 'donate' ? (
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--amber-600)' }}>FREE</div>
                ) : transactionType === 'exchange' ? (
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--blue-600)' }}>Direct Swap / Exchange</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--emerald-600)' }}>₹{sellingPrice}</span>
                    {originalPrice > sellingPrice && (
                      <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-light)' }}>
                        Original ₹{originalPrice}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              {transactionType === 'buy' && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Pay at Handover</div>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="cash">Cash at Handover</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
              {isOwner ? (
                <div className="badge badge-blue" style={{ padding: '0.65rem 1rem', fontSize: '0.9rem', justifyContent: 'center' }}>
                  This is your active listing.
                </div>
              ) : !isAvailable ? (
                <div className="badge badge-rose" style={{ padding: '0.65rem 1rem', fontSize: '0.9rem', justifyContent: 'center' }}>
                  This book is currently reserved or sold.
                </div>
              ) : (
                <button
                  onClick={handleRequestToBuy}
                  disabled={reserving}
                  className="btn btn-emerald btn-lg"
                  style={{ width: '100%' }}
                >
                  <ShoppingBag size={20} />
                  {reserving ? 'Sending Request...' : book.transaction_type === 'donate' ? 'Request Free Book' : book.transaction_type === 'exchange' ? 'Propose Exchange' : 'Request to Buy'}
                </button>
              )}
            </div>

            {/* Book Details Specifications List */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Book Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div><strong style={{ color: 'var(--text-muted)' }}>ISBN:</strong> {book.isbn || 'N/A'}</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>Edition:</strong> {book.edition || 'Standard'}</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>Subject:</strong> {book.subject}</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>Campus Pickup:</strong> {book.location}</div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Seller's Description</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', lineHeight: 1.6 }}>{book.description || 'No description provided.'}</p>
            </div>

            {/* Seller Profile Card */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {book.seller_avatar ? (
                  <img
                    src={book.seller_avatar}
                    alt={book.seller_name}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--emerald-100)', color: 'var(--emerald-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                    {book.seller_name ? book.seller_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{book.seller_name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{book.seller_institution}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--amber-600)', fontWeight: 600, marginTop: '2px' }}>
                    {book.seller_rating > 0 ? (
                      <>
                        <Star size={12} fill="var(--amber-500)" stroke="none" /> {book.seller_rating} Student Rating
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No reviews yet</span>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={handleReportListing} style={{ color: 'var(--rose-500)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldAlert size={14} /> Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

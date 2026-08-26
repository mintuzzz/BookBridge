import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BookCard from '../components/books/BookCard';
import { Heart, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WishlistPage() {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${localStorage.getItem('bb_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWishlist(data);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem' }}>❤️ Saved Wishlist Books</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Keep track of books you plan to buy or exchange later in the semester.</p>
        </div>

        {!isAuthenticated ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>Please log in to view saved wishlist books.</div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>Loading wishlist...</div>
        ) : wishlist.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Heart size={48} color="var(--rose-500)" style={{ margin: '0 auto 1rem' }} />
            <h3>Your wishlist is empty</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Save books you're interested in while browsing.</p>
            <Link to="/browse" className="btn btn-emerald btn-sm">Explore Marketplace</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {wishlist.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

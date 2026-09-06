import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookCard from '../components/books/BookCard';
import BookFilters from '../components/books/BookFilters';
import { Search, LayoutGrid, List, SlidersHorizontal, BookOpen } from 'lucide-react';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    department: searchParams.get('department') || 'All',
    semester: searchParams.get('semester') || 'All',
    condition: 'All',
    transaction_type: searchParams.get('type') || 'All',
    max_price: 1500,
    sort: 'newest'
  });

  const [viewMode, setViewMode] = useState('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [filters]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.department !== 'All') queryParams.set('department', filters.department);
      if (filters.semester !== 'All') queryParams.set('semester', filters.semester);
      if (filters.condition !== 'All') queryParams.set('condition', filters.condition);
      if (filters.transaction_type !== 'All') queryParams.set('transaction_type', filters.transaction_type);
      if (filters.max_price < 2000) queryParams.set('max_price', filters.max_price);
      if (filters.sort) queryParams.set('sort', filters.sort);

      const res = await fetch(`/api/books?${queryParams.toString()}`);
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch browse books error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      department: 'All',
      semester: 'All',
      condition: 'All',
      transaction_type: 'All',
      max_price: 2000,
      sort: 'newest'
    });
    setSearchParams({});
  };

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        {/* Header & Search Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Browse Campus Textbooks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Discover available books listed by verified students at your institution.</p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search title, author, ISBN or subject..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem 0.7rem 2.6rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'white',
                  outline: 'none'
                }}
              />
            </div>

            {/* Sorting Dropdown */}
            <select
              value={filters.sort}
              onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
              style={{
                padding: '0.7rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'white',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Main 2-Column Filter + Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }} className="browse-layout">
          {/* Side Filter */}
          <div className="desktop-filters">
            <BookFilters filters={filters} setFilters={setFilters} onReset={handleResetFilters} />
          </div>

          {/* Book Cards Grid */}
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                Loading books...
              </div>
            ) : books.length === 0 ? (
              <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <BookOpen size={48} color="var(--emerald-600)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>📚 No books available yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Be the first student to list a book on campus.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button onClick={handleResetFilters} className="btn btn-outline btn-sm">
                    Reset All Filters
                  </button>
                  <Link to="/sell" className="btn btn-emerald btn-sm">
                    List a Book
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Showing {books.length} book listings
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .browse-layout { grid-template-columns: 1fr !important; }
          .desktop-filters { display: block; }
        }
      `}</style>
    </div>
  );
}

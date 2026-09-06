import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BookCard from '../components/books/BookCard';
import {
  Search,
  BookOpen,
  PlusCircle,
  Repeat,
  Gift,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [allBooks, setAllBooks] = useState([]);
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [freeBooks, setFreeBooks] = useState([]);
  const [stats, setStats] = useState({ booksReused: 0, moneySaved: 0, peerExchanges: 0, freeDonations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/books?status=available')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const safeData = Array.isArray(data) ? data : [];
        setAllBooks(safeData);
        setFeaturedBooks(safeData.slice(0, 4));
        setFreeBooks(safeData.filter((b) => (b.transaction_type || b.transactionType) === 'donate').slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/books/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categoryList = [
    { name: 'Computer Science', icon: '💻' },
    { name: 'Engineering', icon: '⚙️' },
    { name: 'Medicine', icon: '🩺' },
    { name: 'Commerce', icon: '📊' },
    { name: 'Management', icon: '📈' },
    { name: 'Arts', icon: '🎨' },
    { name: 'Science', icon: '🔬' },
    { name: 'Law', icon: '⚖️' }
  ];

  const getDeptCount = (deptName) => {
    const safeList = Array.isArray(allBooks) ? allBooks : [];
    const count = safeList.filter((b) => b.department === deptName).length;
    return `${count} ${count === 1 ? 'Book' : 'Books'}`;
  };

  const heroPreviewBook = featuredBooks.length > 0 ? featuredBooks[0] : null;

  return (
    <div>
      {/* HERO SECTION */}
      <section
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
          borderBottom: '1px solid var(--border-light)',
          padding: '4rem 0 5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            <div>
              <span className="badge badge-emerald" style={{ marginBottom: '1rem', padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}>
                <Sparkles size={14} /> Official Campus Student Network
              </span>

              <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', lineHeight: 1.15, marginBottom: '1.25rem', color: 'var(--text-dark)' }}>
                Books You're Done With. <br />
                <span style={{ color: 'var(--emerald-600)' }}>Someone Else Is Looking For.</span>
              </h1>

              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '540px', lineHeight: 1.6 }}>
                Buy used textbooks at student prices, swap course materials with peers, or pass down books for free. Verified campus pickup & pay at pickup.
              </p>

              {/* Search Bar Box */}
              <form
                onSubmit={handleHeroSearch}
                style={{
                  display: 'flex',
                  backgroundColor: 'white',
                  padding: '6px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-light)',
                  marginBottom: '2rem',
                  maxWidth: '560px'
                }}
              >
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <Search size={20} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search title, author, ISBN or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.8rem',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <button type="submit" className="btn btn-emerald" style={{ borderRadius: 'var(--radius-full)', padding: '0.75rem 1.75rem' }}>
                  Browse Books
                </button>
              </form>

              {/* Hero Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/sell" className="btn btn-emerald btn-lg">
                  <PlusCircle size={18} /> Sell / List a Book
                </Link>
                <Link to="/exchanges" className="btn btn-outline btn-lg">
                  <Repeat size={18} /> Exchange Engine
                </Link>
              </div>
            </div>

            {/* Hero Visual Card Stack */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              {heroPreviewBook ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '440px',
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.75rem',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {heroPreviewBook.seller_avatar ? (
                        <img
                          src={heroPreviewBook.seller_avatar}
                          alt={heroPreviewBook.seller_name}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--emerald-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-700)', fontWeight: 700 }}>
                          {heroPreviewBook.seller_name ? heroPreviewBook.seller_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{heroPreviewBook.seller_name || 'Verified Student'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{heroPreviewBook.department} · Sem {heroPreviewBook.semester}</div>
                      </div>
                    </div>
                    <span className="badge badge-emerald">Verified Student</span>
                  </div>

                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '180px', marginBottom: '1rem', position: 'relative', backgroundColor: '#f1f5f9' }}>
                    {heroPreviewBook.images && heroPreviewBook.images.length > 0 ? (
                      <img
                        src={heroPreviewBook.images[0]}
                        alt={heroPreviewBook.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <BookOpen size={48} color="var(--emerald-600)" style={{ marginBottom: '0.5rem' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>No Image Available</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', backgroundColor: 'rgba(255,255,255,0.92)', padding: '0.35rem 0.75rem', borderRadius: '20px', fontWeight: 800, fontSize: '1rem', color: 'var(--emerald-700)' }}>
                      {(heroPreviewBook.transaction_type || heroPreviewBook.transactionType) === 'donate' ? 'FREE' : (heroPreviewBook.transaction_type || heroPreviewBook.transactionType) === 'exchange' ? 'Exchange' : `₹${heroPreviewBook.selling_price ?? heroPreviewBook.sellingPrice ?? 0}`}
                    </div>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>{heroPreviewBook.title}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>📍 {heroPreviewBook.location}</span>
                    <span style={{ color: 'var(--emerald-600)', fontWeight: 700 }}>{heroPreviewBook.condition}</span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '440px',
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-xl)',
                    padding: '2.5rem 1.75rem',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border-light)',
                    textAlign: 'center'
                  }}
                >
                  <BookOpen size={56} color="var(--emerald-600)" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Campus Marketplace Ready</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Be the first student to list a textbook and start reusing course materials today!
                  </p>
                  <Link to="/sell" className="btn btn-emerald btn-md">
                    <PlusCircle size={16} /> List Your First Book
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SUSTAINABILITY STATS BANNER */}
      <section style={{ backgroundColor: 'var(--emerald-700)', color: 'white', padding: '1.75rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>🌱 {stats.booksReused}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Books Reused</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>💰 ₹{stats.moneySaved.toLocaleString()}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Student Money Saved</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>🔄 {stats.peerExchanges}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Peer Exchanges</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>🎁 {stats.freeDonations}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Free Books Donated</div>
          </div>
        </div>
      </section>

      {/* ACADEMIC CATEGORIES GRID */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Explore by Department</h2>
            <p style={{ color: 'var(--text-muted)' }}>Find textbooks tailored to your exact campus department and semester syllabus.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            {categoryList.map((cat) => (
              <Link
                key={cat.name}
                to={`/browse?department=${encodeURIComponent(cat.name)}`}
                className="card"
                style={{ padding: '1.5rem 1rem', textAlign: 'center', transition: 'all 0.2s ease' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{cat.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-dark)' }}>{cat.name}</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px' }}>{getDeptCount(cat.name)}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED BOOKS */}
      <section style={{ padding: '3rem 0', backgroundColor: 'white', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.7rem' }}>Recently Listed Textbooks</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fresh listings added by verified campus peers.</p>
            </div>
            <Link to="/browse" className="btn btn-outline btn-sm">View All Books <ArrowRight size={16} /></Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading textbooks...</div>
          ) : featuredBooks.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <BookOpen size={48} color="var(--emerald-600)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No books available yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Be the first student to list a textbook for your peers on campus.
              </p>
              <Link to="/sell" className="btn btn-emerald btn-sm">
                <PlusCircle size={16} /> List Your First Book
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {featuredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FREE BOOKS & DONATIONS BANNER */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--amber-100)', color: 'var(--amber-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Gift size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem' }}>Free Book Donations</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generous seniors passing down books for zero cost.</p>
              </div>
            </div>
            <Link to="/donations" className="btn btn-outline btn-sm">Browse Free Feed <ArrowRight size={16} /></Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading free donations...</div>
          ) : freeBooks.length === 0 ? (
            <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <Gift size={48} color="var(--amber-500)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No free book donations yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Donate your used textbooks to help fellow students in need.
              </p>
              <Link to="/sell" className="btn btn-emerald btn-sm" style={{ backgroundColor: 'var(--amber-600)', borderColor: 'var(--amber-600)' }}>
                Donate a Book
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {freeBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW BOOKBRIDGE WORKS */}
      <section style={{ padding: '4rem 0', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>How BookBridge Works</h2>
            <p style={{ color: 'var(--text-muted)' }}>Simple 4-step campus lifecycle that eliminates informal WhatsApp group noise.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800, fontSize: '1.25rem' }}>
                1
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Find or List</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Search by department/ISBN or create a listing in under 60 seconds.</p>
            </div>

            <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--blue-50)', color: 'var(--blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800, fontSize: '1.25rem' }}>
                2
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Reserve & Chat</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Reserve book, initiate exchange proposal, and coordinate pickup spot.</p>
            </div>

            <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--amber-50)', color: 'var(--amber-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800, fontSize: '1.25rem' }}>
                3
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Campus Pickup</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Meet safely at library or canteen. Pay cash or UPI at pickup.</p>
            </div>

            <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800, fontSize: '1.25rem' }}>
                4
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>OTP Verification</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Verify 6-digit OTP code to complete order and earn Eco Points!</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

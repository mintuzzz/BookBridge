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
  Sparkles,
  ShieldCheck,
  Leaf,
  Coins,
  Compass,
  ArrowUpRight,
  MessageSquare,
  FileText
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [allBooks, setAllBooks] = useState([]);
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [freeBooks, setFreeBooks] = useState([]);
  const [exchangeBooks, setExchangeBooks] = useState([]);
  const [stats, setStats] = useState({ booksReused: 0, moneySaved: 0, peerExchanges: 0, freeDonations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/books?status=available')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const safeData = Array.isArray(data) ? data : [];
        setAllBooks(safeData);
        setFeaturedBooks(safeData.slice(0, 8));
        setFreeBooks(safeData.filter((b) => (b.transaction_type || b.transactionType) === 'donate').slice(0, 4));
        setExchangeBooks(safeData.filter((b) => (b.transaction_type || b.transactionType) === 'exchange').slice(0, 4));
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

  const departments = [
    { name: 'Computer Science', countKey: 'Computer Science', icon: '💻' },
    { name: 'Engineering', countKey: 'Engineering', icon: '⚙️' },
    { name: 'Medicine', countKey: 'Medicine', icon: '🩺' },
    { name: 'Commerce', countKey: 'Commerce', icon: '📊' },
    { name: 'Management', countKey: 'Management', icon: '📈' },
    { name: 'Arts', countKey: 'Arts', icon: '🎨' },
    { name: 'Science', countKey: 'Science', icon: '🔬' },
    { name: 'Law', countKey: 'Law', icon: '⚖️' }
  ];

  const getDeptCount = (deptName) => {
    const count = (allBooks || []).filter((b) => b.department === deptName).length;
    return `${count} ${count === 1 ? 'Book' : 'Books'}`;
  };

  // Real book from actual backend records for the hero feature spotlight
  const heroSpotlight = featuredBooks.length > 0 ? featuredBooks[0] : null;

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ==================================================== */}
      {/* 1. EDITORIAL HERO SECTION                            */}
      {/* ==================================================== */}
      <section
        style={{
          position: 'relative',
          padding: '4.5rem 0 5.5rem',
          overflow: 'hidden',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        {/* Subtle decorative background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            right: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(207, 160, 62, 0.08) 0%, rgba(250, 247, 242, 0) 70%)',
            pointerEvents: 'none'
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '4rem',
              alignItems: 'center'
            }}
          >
            {/* Left Column: Editorial Headline & Actions */}
            <div>
              {/* Editorial Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--forest-50)',
                  border: '1px solid var(--forest-100)',
                  color: 'var(--forest-800)',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  marginBottom: '1.25rem'
                }}
              >
                <Sparkles size={13} color="var(--gold-600)" />
                <span>STUDENT-TO-STUDENT BOOK EXCHANGE</span>
              </div>

              {/* Major Editorial Headline */}
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(2.4rem, 5.2vw, 3.8rem)',
                  lineHeight: 1.1,
                  color: 'var(--forest-950)',
                  marginBottom: '1.25rem',
                  letterSpacing: '-0.025em'
                }}
              >
                Books for every <br />
                <span style={{ fontStyle: 'italic', color: 'var(--forest-700)' }}>mind & moment.</span>
              </h1>

              {/* Supporting Text */}
              <p
                style={{
                  fontSize: '1.15rem',
                  color: 'var(--charcoal-600)',
                  lineHeight: 1.65,
                  maxWidth: '520px',
                  marginBottom: '2rem',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Read more. Spend less. Share what you no longer need. Connect with peers at your campus to buy, exchange, and donate academic textbooks directly.
              </p>

              {/* Editorial Hero Search Bar */}
              <form
                onSubmit={handleHeroSearch}
                style={{
                  display: 'flex',
                  backgroundColor: '#FFFFFF',
                  padding: '5px 6px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-light)',
                  marginBottom: '2rem',
                  maxWidth: '540px'
                }}
              >
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--charcoal-400)' }} />
                  <input
                    type="text"
                    placeholder="Search title, author, ISBN or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '0.925rem',
                      color: 'var(--charcoal-900)'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-forest"
                  style={{ borderRadius: 'var(--radius-full)', padding: '0.75rem 1.6rem', fontSize: '0.875rem' }}
                >
                  Search
                </button>
              </form>

              {/* Hero Dual Call-to-Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link to="/browse" className="btn btn-forest btn-lg" style={{ gap: '0.5rem' }}>
                  Browse Books <ArrowRight size={17} />
                </Link>

                <Link
                  to="/exchanges"
                  className="btn btn-outline btn-lg"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: 'var(--border-light)',
                    color: 'var(--charcoal-800)'
                  }}
                >
                  <Repeat size={16} color="var(--forest-700)" /> Explore Exchange
                </Link>
              </div>
            </div>

            {/* Right Column: Editorial Featured Book Showcase (Real Data) */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {heroSpotlight ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '430px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.75rem',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  {/* Top verified badge header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--forest-100)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--forest-800)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-serif)'
                        }}
                      >
                        {heroSpotlight.seller_name ? heroSpotlight.seller_name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--charcoal-900)' }}>
                          {heroSpotlight.seller_name || 'Verified Student'}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--charcoal-500)' }}>
                          {heroSpotlight.department} • Sem {heroSpotlight.semester}
                        </div>
                      </div>
                    </div>

                    <span className="badge badge-forest">Campus Verified</span>
                  </div>

                  {/* Book cover frame */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      height: '210px',
                      backgroundColor: 'var(--bg-secondary)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <div
                      className="book-cover-frame"
                      style={{ width: '140px', height: '190px', backgroundColor: '#FAF7F2' }}
                    >
                      {heroSpotlight.images && heroSpotlight.images.length > 0 ? (
                        <img
                          src={heroSpotlight.images[0].startsWith('http') || heroSpotlight.images[0].startsWith('data:') ? heroSpotlight.images[0] : (heroSpotlight.images[0].startsWith('/') ? heroSpotlight.images[0] : `/${heroSpotlight.images[0]}`)}
                          alt={heroSpotlight.title}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                            color: 'var(--forest-800)'
                          }}
                        >
                          <BookOpen size={36} color="var(--gold-600)" style={{ marginBottom: '0.5rem' }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{heroSpotlight.department}</span>
                        </div>
                      )}
                    </div>

                    {/* Transaction tag */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)',
                        padding: '0.35rem 0.85rem',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        color: 'var(--forest-900)',
                        boxShadow: 'var(--shadow-sm)',
                        fontFamily: 'var(--font-serif)'
                      }}
                    >
                      {(heroSpotlight.transaction_type || heroSpotlight.transactionType) === 'donate'
                        ? 'FREE DONATION'
                        : (heroSpotlight.transaction_type || heroSpotlight.transactionType) === 'exchange'
                        ? 'SWAP AVAILABLE'
                        : `₹${heroSpotlight.selling_price ?? heroSpotlight.sellingPrice ?? 0}`}
                    </div>
                  </div>

                  {/* Title & metadata */}
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      lineHeight: 1.3,
                      marginBottom: '0.35rem',
                      color: 'var(--forest-950)'
                    }}
                  >
                    {heroSpotlight.title}
                  </h3>

                  <p style={{ fontSize: '0.825rem', color: 'var(--charcoal-500)', fontStyle: 'italic', marginBottom: '0.85rem' }}>
                    by {heroSpotlight.author || 'Course Faculty'}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                      color: 'var(--charcoal-600)'
                    }}
                  >
                    <span>📍 {heroSpotlight.location || 'Library pickup'}</span>
                    <Link
                      to={`/books/${heroSpotlight.id || heroSpotlight._id}`}
                      style={{
                        color: 'var(--forest-800)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      View Details <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '420px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-xl)',
                    padding: '3rem 2rem',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border-light)',
                    textAlign: 'center'
                  }}
                >
                  <BookOpen size={52} color="var(--forest-700)" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '0.5rem', color: 'var(--forest-950)' }}>
                    Campus Marketplace Ready
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--charcoal-600)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
                    Join your fellow students in circulating textbooks and course syllabus materials.
                  </p>
                  <Link to="/sell" className="btn btn-forest">
                    <PlusCircle size={16} /> List Your Textbook
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 2. VALUE / PILLARS SECTION                           */}
      {/* ==================================================== */}
      <section style={{ padding: '3.5rem 0', backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '2rem'
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--forest-50)',
                  color: 'var(--forest-800)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Coins size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                  Affordable Learning
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--charcoal-500)', lineHeight: 1.5 }}>
                  Save up to 70% compared to bookstore prices by transacting peer-to-peer.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--gold-50)',
                  color: 'var(--gold-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Repeat size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                  Course Book Exchange
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--charcoal-500)', lineHeight: 1.5 }}>
                  Trade last semester's materials directly for what you need this semester.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--forest-50)',
                  color: 'var(--forest-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                  Safe Campus Handovers
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--charcoal-500)', lineHeight: 1.5 }}>
                  Meet on campus at libraries or departments with pay-at-pickup verification.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--blue-50)',
                  color: 'var(--blue-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Leaf size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                  Zero-Waste Circularity
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--charcoal-500)', lineHeight: 1.5 }}>
                  Keep textbooks circulating across classes instead of gathering dust.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 3. ACADEMIC CATEGORIES GRID                          */}
      {/* ==================================================== */}
      <section style={{ padding: '4.5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
            <span className="editorial-kicker">Faculty Syllabus Curations</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.1rem', color: 'var(--forest-950)', marginBottom: '0.5rem' }}>
              Browse by Discipline
            </h2>
            <p style={{ color: 'var(--charcoal-500)', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto' }}>
              Select your academic discipline to discover course texts listed by students in your department.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {departments.map((dept) => (
              <Link
                key={dept.name}
                to={`/browse?department=${encodeURIComponent(dept.name)}`}
                className="card"
                style={{
                  padding: '1.75rem 1rem',
                  textAlign: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>{dept.icon}</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    color: 'var(--charcoal-900)',
                    fontFamily: 'var(--font-sans)',
                    marginBottom: '0.2rem'
                  }}
                >
                  {dept.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--forest-700)', fontWeight: 600 }}>
                  {getDeptCount(dept.name)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 4. LATEST / POPULAR BOOKS CATALOG                    */}
      {/* ==================================================== */}
      <section
        style={{
          padding: '4.5rem 0',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="editorial-kicker">Fresh Listings</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--forest-950)' }}>
                Recently Added Textbooks
              </h2>
              <p style={{ color: 'var(--charcoal-500)', fontSize: '0.9rem', marginTop: '4px' }}>
                Course texts, study editions, and references published by campus peers.
              </p>
            </div>

            <Link to="/browse" className="btn btn-outline btn-sm" style={{ gap: '0.35rem' }}>
              View Complete Catalog <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--charcoal-500)' }}>
              Loading campus listings...
            </div>
          ) : featuredBooks.length === 0 ? (
            <div className="card" style={{ padding: '4rem 1.5rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
              <BookOpen size={48} color="var(--forest-700)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                No active listings yet
              </h3>
              <p style={{ color: 'var(--charcoal-500)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Be the first scholar to list a course textbook and help a peer this semester.
              </p>
              <Link to="/sell" className="btn btn-forest btn-sm">
                <PlusCircle size={15} /> List a Textbook
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.75rem'
              }}
            >
              {featuredBooks.map((book) => (
                <BookCard key={book.id || book._id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================== */}
      {/* 5. EXCHANGE SPOTLIGHT SECTION                        */}
      {/* ==================================================== */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-primary)' }}>
        <div className="container">
          <div
            style={{
              backgroundColor: 'var(--forest-900)',
              color: '#FAF7F2',
              borderRadius: 'var(--radius-xl)',
              padding: '3.5rem 3rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '3rem',
              alignItems: 'center',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid rgba(216, 160, 56, 0.2)'
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(216, 160, 56, 0.15)',
                  color: 'var(--gold-500)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  marginBottom: '1rem'
                }}
              >
                <Repeat size={13} /> PEER EXCHANGE ENGINE
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)',
                  color: '#FAF7F2',
                  marginBottom: '1rem',
                  lineHeight: 1.15
                }}
              >
                Trade course texts <br />
                <span style={{ color: 'var(--gold-500)', fontStyle: 'italic' }}>without spending money.</span>
              </h2>

              <p style={{ color: '#C2BBB2', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: '2rem' }}>
                Done with your Semester 3 Calculus or Organic Chemistry text? Propose a direct return trade with a student taking that course next term in exchange for the reference books you need right now.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/exchanges" className="btn btn-gold btn-md" style={{ fontWeight: 700 }}>
                  Explore Exchange Feed <ArrowRight size={15} />
                </Link>
                <Link
                  to="/sell"
                  className="btn btn-outline btn-md"
                  style={{ backgroundColor: 'transparent', color: '#FAF7F2', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  List a Book for Trade
                </Link>
              </div>
            </div>

            {/* Right side preview of exchange matches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gold-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    How Exchange Works
                  </span>
                  <span className="badge badge-forest" style={{ backgroundColor: 'rgba(207, 160, 62, 0.15)', color: 'var(--gold-500)', borderColor: 'transparent' }}>
                    3 Steps
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--gold-500)', color: 'var(--forest-950)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                      1
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#E5DFD7' }}>
                      <strong>Select an available listing</strong> marked with the Exchange badge.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--gold-500)', color: 'var(--forest-950)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                      2
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#E5DFD7' }}>
                      <strong>Propose which of your books</strong> you want to trade in return.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--gold-500)', color: 'var(--forest-950)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                      3
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#E5DFD7' }}>
                      <strong>Meet at campus library</strong> to inspect and complete the swap.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 6. SENIOR DONATIONS / FREE SHELF                     */}
      {/* ==================================================== */}
      {freeBooks.length > 0 && (
        <section style={{ padding: '4rem 0', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--border-light)' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="editorial-kicker">Giving Back</span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', color: 'var(--forest-950)' }}>
                  Free Senior Book Donations
                </h2>
                <p style={{ color: 'var(--charcoal-500)', fontSize: '0.875rem' }}>
                  Generous graduating seniors passing down textbooks for zero cost.
                </p>
              </div>

              <Link to="/donations" className="btn btn-outline btn-sm">
                Browse All Donations <ArrowRight size={14} />
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.75rem'
              }}
            >
              {freeBooks.map((book) => (
                <BookCard key={book.id || book._id} book={book} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* 7. WANTED BOOK BOARD & COMMUNITY                     */}
      {/* ==================================================== */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container">
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-xl)',
              padding: '3rem 2.5rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-md)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2.5rem',
              alignItems: 'center'
            }}
          >
            <div>
              <span className="editorial-kicker">Campus Community Board</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.95rem', color: 'var(--forest-950)', marginBottom: '0.75rem' }}>
                Can't find your syllabus edition?
              </h2>
              <p style={{ color: 'var(--charcoal-600)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Post a wanted request on the BookBridge board. When a senior or classmate finishes their course, they can notify you directly or accept your request.
              </p>
              <Link to="/requests" className="btn btn-forest btn-md">
                <FileText size={16} /> View Wanted Book Board
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--charcoal-900)' }}>
                    Looking for "Operating Systems Concepts (10th Ed)"
                  </span>
                  <span className="badge badge-forest" style={{ fontSize: '0.7rem' }}>CS Dept</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--charcoal-500)' }}>
                  Posted by 2nd year student • Offering ₹400 or trade for Data Structures text
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--charcoal-900)' }}>
                    Wanted: "Harrison's Principles of Internal Medicine"
                  </span>
                  <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>Medicine</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--charcoal-500)' }}>
                  Posted by 3rd year MBBS student • Urgent for clinic rotation
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 8. CALL TO ACTION FOR LISTING A BOOK                 */}
      {/* ==================================================== */}
      <section style={{ padding: '5rem 0', backgroundColor: '#FAF7F2' }}>
        <div className="container">
          <div
            style={{
              textAlign: 'center',
              maxWidth: '640px',
              margin: '0 auto'
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'var(--forest-100)',
                color: 'var(--forest-800)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}
            >
              <BookOpen size={26} />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.4rem',
                color: 'var(--forest-950)',
                marginBottom: '0.75rem',
                lineHeight: 1.15
              }}
            >
              Have textbooks sitting on your shelf?
            </h2>

            <p style={{ color: 'var(--charcoal-600)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Turn last semester's materials into cash, trade for your next semester reads, or pass them forward to incoming students. Listing takes less than 60 seconds.
            </p>

            <Link to="/sell" className="btn btn-forest btn-lg">
              <PlusCircle size={18} /> List a Textbook Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

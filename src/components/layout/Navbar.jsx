import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  BookOpen,
  Search,
  PlusCircle,
  Repeat,
  FileText,
  ShoppingBag,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  Compass
} from 'lucide-react';
import AuthModal from '../auth/AuthModal';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleOpenAuth = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  };

  const notifList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notifList.filter((n) => !n?.is_read).length;

  const categories = [
    { name: 'Computer Science', path: '/browse?department=Computer%20Science' },
    { name: 'Engineering', path: '/browse?department=Engineering' },
    { name: 'Medicine & Health', path: '/browse?department=Medicine' },
    { name: 'Commerce & Finance', path: '/browse?department=Commerce' },
    { name: 'Management / MBA', path: '/browse?department=Management' },
    { name: 'Arts & Humanities', path: '/browse?department=Arts' },
    { name: 'Science & Math', path: '/browse?department=Science' },
    { name: 'Law & Governance', path: '/browse?department=Law' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-light)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(26, 23, 21, 0.04)'
        }}
      >
        {/* Top Brand Banner Strip */}
        <div
          style={{
            backgroundColor: 'var(--forest-900)',
            color: 'var(--bg-primary)',
            padding: '0.35rem 0',
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--gold-500)', fontWeight: 700 }}>★</span>
              <span>The Official Student Book Exchange & Marketplace</span>
            </div>
            <div style={{ fontStyle: 'italic', opacity: 0.85, display: 'none', '@media (min-width: 640px)': { display: 'block' } }} className="tagline-desktop">
              "Read. Exchange. Give. Repeat."
            </div>
          </div>
        </div>

        {/* Main Navbar Bar */}
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '74px', gap: '1rem' }}>
          {/* Logo & Tagline */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'var(--forest-800)',
                color: 'var(--gold-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(26, 56, 38, 0.25)',
                border: '1px solid rgba(207, 160, 62, 0.3)'
              }}
            >
              <BookOpen size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: 'var(--forest-950)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em'
                }}
              >
                Book<span style={{ color: 'var(--forest-700)' }}>Bridge</span>
              </div>
              <div
                style={{
                  fontSize: '0.675rem',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--gold-700)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '1px'
                }}
              >
                Read • Exchange • Give
              </div>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              flex: '0 1 320px',
              position: 'relative'
            }}
            className="navbar-search-box"
          >
            <input
              type="text"
              placeholder="Search title, author, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.4rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-primary)',
                fontSize: '0.875rem',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--forest-700)';
                e.target.style.boxShadow = '0 0 0 3px rgba(35, 78, 52, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-light)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--charcoal-400)' }}
            />
          </form>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '1.25rem'
            }}
            className="desktop-nav-links"
          >
            <Link
              to="/"
              style={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: isActive('/') ? 'var(--forest-800)' : 'var(--charcoal-700)',
                borderBottom: isActive('/') ? '2px solid var(--forest-800)' : '2px solid transparent',
                paddingBottom: '2px'
              }}
            >
              Home
            </Link>

            <Link
              to="/browse"
              style={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: isActive('/browse') ? 'var(--forest-800)' : 'var(--charcoal-700)',
                borderBottom: isActive('/browse') ? '2px solid var(--forest-800)' : '2px solid transparent',
                paddingBottom: '2px'
              }}
            >
              Books
            </Link>

            {/* Categories Dropdown */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setShowCategoriesDropdown(true)}
              onMouseLeave={() => setShowCategoriesDropdown(false)}
            >
              <button
                type="button"
                style={{
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: 'var(--charcoal-700)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  paddingBottom: '2px'
                }}
              >
                Categories <ChevronDown size={14} />
              </button>

              {showCategoriesDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '230px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border-light)',
                    padding: '0.5rem 0',
                    zIndex: 250,
                    animation: 'fadeIn 0.15s ease'
                  }}
                >
                  {categories.map((cat) => (
                    <Link
                      key={cat.name}
                      to={cat.path}
                      onClick={() => setShowCategoriesDropdown(false)}
                      style={{
                        display: 'block',
                        padding: '0.5rem 1rem',
                        fontSize: '0.825rem',
                        color: 'var(--charcoal-700)',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'var(--bg-primary)';
                        e.target.style.color = 'var(--forest-800)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = 'var(--charcoal-700)';
                      }}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/exchanges"
              style={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: isActive('/exchanges') ? 'var(--forest-800)' : 'var(--charcoal-700)',
                borderBottom: isActive('/exchanges') ? '2px solid var(--forest-800)' : '2px solid transparent',
                paddingBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Repeat size={14} /> Exchange
            </Link>

            <Link
              to="/requests"
              style={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: isActive('/requests') ? 'var(--forest-800)' : 'var(--charcoal-700)',
                borderBottom: isActive('/requests') ? '2px solid var(--forest-800)' : '2px solid transparent',
                paddingBottom: '2px'
              }}
            >
              Requests
            </Link>

            <Link
              to="/orders"
              style={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: isActive('/orders') ? 'var(--forest-800)' : 'var(--charcoal-700)',
                borderBottom: isActive('/orders') ? '2px solid var(--forest-800)' : '2px solid transparent',
                paddingBottom: '2px'
              }}
            >
              Orders
            </Link>

            <Link
              to="/messages"
              style={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: isActive('/messages') ? 'var(--forest-800)' : 'var(--charcoal-700)',
                borderBottom: isActive('/messages') ? '2px solid var(--forest-800)' : '2px solid transparent',
                paddingBottom: '2px'
              }}
            >
              Messages
            </Link>
          </nav>

          {/* Right Action Icons & Auth Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* List / Post Book CTA */}
            <Link
              to="/sell"
              className="btn btn-forest btn-sm navbar-post-btn"
              style={{ display: 'none' }}
            >
              <PlusCircle size={15} /> List a Book
            </Link>

            {/* Authenticated Controls */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Notifications Bell */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      color: 'var(--charcoal-700)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Notifications"
                  >
                    <Bell size={19} />
                    {unreadCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          backgroundColor: 'var(--rose-500)',
                          color: 'white',
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '46px',
                        width: '330px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-xl)',
                        border: '1px solid var(--border-light)',
                        zIndex: 250,
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-serif)' }}>Notifications</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--forest-700)', fontWeight: 600 }}>{notifList.length} recent</span>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: 'var(--gold-700)', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {notifList.length === 0 ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem 0' }}>
                            No notifications yet.
                          </div>
                        ) : (
                          notifList.map((n) => {
                            const notifId = (n.id || n._id || '').toString();
                            return (
                              <Link
                                key={notifId}
                                to={n.link || '#'}
                                onClick={() => {
                                  markAsRead(notifId);
                                  setShowNotifications(false);
                                }}
                                style={{
                                  display: 'block',
                                  padding: '0.65rem',
                                  borderRadius: '8px',
                                  backgroundColor: n.is_read ? '#FFFFFF' : 'var(--forest-50)',
                                  border: '1px solid var(--border-subtle)',
                                  transition: 'background-color 0.15s'
                                }}
                              >
                                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--charcoal-900)' }}>{n.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--charcoal-600)', marginTop: '2px' }}>{n.message}</div>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Link */}
                <Link
                  to="/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    textDecoration: 'none',
                    color: 'var(--charcoal-800)',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--forest-700)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                >
                  <User size={15} color="var(--forest-700)" />
                  <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || user?.full_name || 'Profile'}
                  </span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--forest-800)', borderColor: 'var(--forest-700)', fontSize: '0.775rem', padding: '0.3rem 0.65rem' }}
                  >
                    Admin
                  </Link>
                )}

                {/* Log Out Button */}
                <button
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--charcoal-500)',
                    padding: '0.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '50%',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--rose-500)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--charcoal-500)')}
                  title="Sign out of BookBridge"
                >
                  <LogOut size={17} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.825rem' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleOpenAuth('register')}
                  className="btn btn-forest btn-sm"
                  style={{ fontSize: '0.825rem' }}
                >
                  Join Bridge
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-hamburger-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.4rem',
                color: 'var(--forest-900)'
              }}
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid var(--border-light)',
              padding: '1.25rem 1.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search titles, authors, ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem 0.65rem 2.4rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-primary)'
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--charcoal-400)' }} />
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Home
              </Link>
              <Link
                to="/browse"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Browse Books
              </Link>
              <Link
                to="/exchanges"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Exchange
              </Link>
              <Link
                to="/requests"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Wanted Board
              </Link>
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                My Orders
              </Link>
              <Link
                to="/messages"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Messages
              </Link>
              <Link
                to="/sell"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', backgroundColor: 'var(--forest-100)', color: 'var(--forest-900)', fontWeight: 700, fontSize: '0.875rem', gridColumn: 'span 2', textAlign: 'center' }}
              >
                + List a Book for Sale/Exchange
              </Link>
            </div>
          </div>
        )}

        <style>{`
          @media (min-width: 900px) {
            .desktop-nav-links { display: flex !important; }
            .navbar-search-box { display: block !important; }
            .mobile-hamburger-btn { display: none !important; }
            .navbar-post-btn { display: inline-flex !important; }
          }
          @media (max-width: 899px) {
            .desktop-nav-links { display: none !important; }
            .navbar-search-box { display: none !important; }
            .mobile-hamburger-btn { display: flex !important; }
          }
        `}</style>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}

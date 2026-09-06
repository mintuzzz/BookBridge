import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  BookOpen,
  Search,
  PlusCircle,
  Repeat,
  Heart,
  MessageSquare,
  Bell,
  User,
  ShieldAlert,
  LogOut,
  Leaf,
  Gift,
  HelpCircle,
  CheckCircle2
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const notifList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notifList.filter((n) => !n?.is_read).length;

  return (
    <>
      <header
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid var(--border-light)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
          {/* Logo & Brand Name */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'var(--emerald-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <BookOpen size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.1 }}>
                Book<span style={{ color: 'var(--emerald-500)' }}>Bridge</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                CAMPUS BOOK EXCHANGE
              </div>
            </div>
          </Link>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              flex: '0 1 360px',
              position: 'relative',
              display: 'none',
              '@media (min-width: 768px)': { display: 'block' }
            }}
            className="navbar-search"
          >
            <input
              type="text"
              placeholder="Search by title, author, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.4rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-secondary)',
                fontSize: '0.875rem'
              }}
            />
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}
            />
          </form>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/browse" style={{ fontWeight: 600, fontSize: '0.9rem', color: location.pathname === '/browse' ? 'var(--emerald-600)' : 'var(--text-medium)' }}>
              Browse Books
            </Link>

            <Link to="/exchanges" style={{ fontWeight: 600, fontSize: '0.9rem', color: location.pathname === '/exchanges' ? 'var(--emerald-600)' : 'var(--text-medium)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Repeat size={16} /> Exchanges
            </Link>

            <Link to="/orders" style={{ fontWeight: 600, fontSize: '0.9rem', color: location.pathname === '/orders' ? 'var(--emerald-600)' : 'var(--text-medium)' }}>
              Orders
            </Link>

            <Link to="/sell" className="btn btn-emerald btn-sm" style={{ gap: '0.35rem' }}>
              <PlusCircle size={16} /> Post Book
            </Link>

            {/* Authenticated Controls */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                      color: 'var(--text-medium)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          backgroundColor: 'var(--rose-500)',
                          color: 'white',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          width: '18px',
                          height: '18px',
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
                        top: '48px',
                        width: '320px',
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-xl)',
                        border: '1px solid var(--border-light)',
                        zIndex: 200,
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--emerald-600)', fontWeight: 600 }}>{notifList.length} recent</span>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: 'var(--blue-600)', cursor: 'pointer', fontWeight: 600 }}>
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {notifList.length === 0 ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No notifications yet.</div>
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
                                  padding: '0.6rem',
                                  borderRadius: '8px',
                                  backgroundColor: n.is_read ? 'white' : 'var(--emerald-50)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              >
                                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-dark)' }}>{n.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
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
                    gap: '0.5rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-secondary)',
                    textDecoration: 'none',
                    color: 'var(--text-dark)',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  <User size={18} color="var(--emerald-600)" />
                  <span>{user?.name || user?.full_name || 'Student Profile'}</span>
                </Link>

                {isAdmin && (
                  <Link to="/admin" className="btn btn-outline btn-sm" style={{ color: 'var(--rose-600)', borderColor: 'var(--rose-300)' }}>
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '0.4rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Log out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setShowAuthModal(true);
                  }}
                  className="btn btn-emerald btn-sm"
                >
                  Sign Up
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={(mode) => setAuthMode(mode)}
        />
      )}
    </>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, ShoppingBag, User } from 'lucide-react';

export default function MobileNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '64px',
        zIndex: 900,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
      }}
      className="mobile-only-nav"
    >
      <NavLink
        to="/"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '0.725rem',
          fontWeight: 600,
          color: isActive ? 'var(--emerald-600)' : 'var(--text-muted)'
        })}
      >
        <Home size={20} />
        Home
      </NavLink>

      <NavLink
        to="/browse"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '0.725rem',
          fontWeight: 600,
          color: isActive ? 'var(--emerald-600)' : 'var(--text-muted)'
        })}
      >
        <Search size={20} />
        Browse
      </NavLink>

      <NavLink
        to="/sell"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '0.725rem',
          fontWeight: 600,
          color: isActive ? 'var(--emerald-600)' : 'var(--text-muted)'
        })}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--emerald-600)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '-16px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
          }}
        >
          <PlusCircle size={22} />
        </div>
        Sell
      </NavLink>

      <NavLink
        to="/orders"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '0.725rem',
          fontWeight: 600,
          color: isActive ? 'var(--emerald-600)' : 'var(--text-muted)'
        })}
      >
        <ShoppingBag size={20} />
        Orders
      </NavLink>

      <NavLink
        to="/profile"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '0.725rem',
          fontWeight: 600,
          color: isActive ? 'var(--emerald-600)' : 'var(--text-muted)'
        })}
      >
        <User size={20} />
        Profile
      </NavLink>

      <style>{`
        @media (min-width: 768px) {
          .mobile-only-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, PlusCircle, ShoppingBag, User } from 'lucide-react';

export default function MobileNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '66px',
        zIndex: 900,
        boxShadow: '0 -4px 16px rgba(26, 23, 21, 0.06)'
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
          color: isActive ? 'var(--forest-800)' : 'var(--charcoal-500)'
        })}
      >
        <Home size={19} />
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
          color: isActive ? 'var(--forest-800)' : 'var(--charcoal-500)'
        })}
      >
        <Compass size={19} />
        Browse
      </NavLink>

      <NavLink
        to="/sell"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '0.725rem',
          fontWeight: 600,
          color: 'var(--charcoal-600)'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'var(--forest-800)',
            color: 'var(--gold-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '-18px',
            boxShadow: '0 4px 14px rgba(26, 56, 38, 0.35)',
            border: '2px solid #FFFFFF'
          }}
        >
          <PlusCircle size={22} />
        </div>
        List
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
          color: isActive ? 'var(--forest-800)' : 'var(--charcoal-500)'
        })}
      >
        <ShoppingBag size={19} />
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
          color: isActive ? 'var(--forest-800)' : 'var(--charcoal-500)'
        })}
      >
        <User size={19} />
        Profile
      </NavLink>

      <style>{`
        @media (min-width: 900px) {
          .mobile-only-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

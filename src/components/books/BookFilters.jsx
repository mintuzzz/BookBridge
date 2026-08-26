import React from 'react';
import { Filter, RefreshCw, Check } from 'lucide-react';

export default function BookFilters({ filters, setFilters, onReset }) {
  const departments = ['All', 'Computer Science', 'Engineering', 'Medicine', 'Commerce', 'Management', 'Arts', 'Science', 'Law'];
  const semesters = ['All', '1', '2', '3', '4', '5', '6', '7', '8'];
  const conditions = ['All', 'Like New', 'Very Good', 'Good', 'Acceptable'];
  const types = [
    { label: 'All Types', value: 'All' },
    { label: '🛒 Resale (Buy)', value: 'buy' },
    { label: '🔄 Exchange', value: 'exchange' },
    { label: '🎁 Free Donation', value: 'donate' }
  ];

  return (
    <div className="card" style={{ padding: '1.25rem', position: 'sticky', top: '90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-dark)' }}>
          <Filter size={18} color="var(--emerald-600)" /> Filter Books
        </div>
        <button
          onClick={onReset}
          style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <RefreshCw size={12} /> Reset
        </button>
      </div>

      {/* Transaction Type Filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem', display: 'block' }}>
          Transaction Type
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilters((prev) => ({ ...prev, transaction_type: t.value }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: filters.transaction_type === t.value ? 700 : 500,
                backgroundColor: filters.transaction_type === t.value ? 'var(--emerald-50)' : 'transparent',
                color: filters.transaction_type === t.value ? 'var(--emerald-700)' : 'var(--text-medium)',
                border: filters.transaction_type === t.value ? '1px solid var(--emerald-100)' : '1px solid transparent',
                textAlign: 'left'
              }}
            >
              <span>{t.label}</span>
              {filters.transaction_type === t.value && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Department Filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem', display: 'block' }}>
          Department / Faculty
        </label>
        <select
          value={filters.department}
          onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white', fontSize: '0.85rem' }}
        >
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Semester Filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem', display: 'block' }}>
          Semester
        </label>
        <select
          value={filters.semester}
          onChange={(e) => setFilters((prev) => ({ ...prev, semester: e.target.value }))}
          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white', fontSize: '0.85rem' }}
        >
          {semesters.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All Semesters' : `Semester ${s}`}</option>
          ))}
        </select>
      </div>

      {/* Condition Filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem', display: 'block' }}>
          Book Condition
        </label>
        <select
          value={filters.condition}
          onChange={(e) => setFilters((prev) => ({ ...prev, condition: e.target.value }))}
          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white', fontSize: '0.85rem' }}
        >
          {conditions.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Conditions' : c}</option>
          ))}
        </select>
      </div>

      {/* Max Price Range Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>
          <span>Max Selling Price</span>
          <span style={{ color: 'var(--emerald-600)' }}>₹{filters.max_price}</span>
        </div>
        <input
          type="range"
          min="50"
          max="2000"
          step="50"
          value={filters.max_price}
          onChange={(e) => setFilters((prev) => ({ ...prev, max_price: e.target.value }))}
          style={{ width: '100%', accentColor: 'var(--emerald-600)', cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}

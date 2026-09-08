import React from 'react';
import { Link } from 'react-router-dom';
import { Repeat, Sparkles, ArrowRightLeft, Star, MapPin, CheckCircle2, Check, X, Clock } from 'lucide-react';

export default function ExchangeMatchCard({ match, existingProposal, currentUserId, onSendProposal, onAcceptProposal, onRejectProposal }) {
  const { my_book, target_book, match_level, match_reason } = match;

  const isPerfect = match_level === 'perfect';
  const isStrong = match_level === 'strong';

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        borderLeft: `5px solid ${isPerfect ? '#10b981' : isStrong ? '#2563eb' : '#f59e0b'}`,
        backgroundColor: isPerfect ? '#f0fdf4' : 'white',
        marginBottom: '1rem'
      }}
    >
      {/* Match Header Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isPerfect ? (
            <span className="badge badge-emerald" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              <Sparkles size={14} /> 100% Perfect Exchange Match
            </span>
          ) : isStrong ? (
            <span className="badge badge-blue" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              <Repeat size={14} /> Strong Department Match
            </span>
          ) : (
            <span className="badge badge-amber" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              <Repeat size={14} /> Related Category Match
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Campus Pickup: {target_book.location || 'Central Campus'}
        </span>
      </div>

      {/* Two Books Swap Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        {/* Left: Your Offered Book */}
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--emerald-700)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Book You Have
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)' }}>{my_book.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{my_book.department} · Sem {my_book.semester}</div>
        </div>

        {/* Center Swap Icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: isPerfect ? 'var(--emerald-500)' : 'var(--blue-600)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <ArrowRightLeft size={20} />
        </div>

        {/* Right: Target Swap Book */}
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--blue-700)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Book Student Has
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)' }}>{target_book.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by {target_book.owner_name} ({target_book.department})</div>
        </div>
      </div>

      {/* Rationale & Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-medium)', flex: 1, margin: 0 }}>
          {match_reason}
        </p>

        {existingProposal ? (
          (() => {
            const isRecipient = currentUserId && (existingProposal.owner_id === currentUserId.toString());
            const isSender = currentUserId && (existingProposal.requester_id === currentUserId.toString());
            const isPending = existingProposal.status === 'pending';

            if (isRecipient && isPending) {
              return (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => onRejectProposal && onRejectProposal(existingProposal.id || existingProposal._id)}
                    className="btn btn-sm btn-outline"
                    style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  >
                    <X size={14} /> Decline
                  </button>
                  <button
                    onClick={() => onAcceptProposal && onAcceptProposal(existingProposal.id || existingProposal._id)}
                    className="btn btn-sm btn-emerald"
                  >
                    <Check size={14} /> Accept Exchange
                  </button>
                </div>
              );
            }

            if (isSender && isPending) {
              return (
                <span className="badge badge-amber" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <Clock size={14} /> Proposal Sent (Pending Response)
                </span>
              );
            }

            if (['accepted', 'scheduled', 'handover_pending'].includes(existingProposal.status)) {
              return (
                <span className="badge badge-blue" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <CheckCircle2 size={14} /> Exchange Accepted & Active
                </span>
              );
            }

            if (existingProposal.status === 'completed') {
              return (
                <span className="badge badge-emerald" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <Sparkles size={14} /> Exchange Completed
                </span>
              );
            }

            return (
              <button
                onClick={() => onSendProposal && onSendProposal(match)}
                className={`btn btn-sm ${isPerfect ? 'btn-emerald' : 'btn-blue'}`}
              >
                <Repeat size={14} /> Send Exchange Proposal
              </button>
            );
          })()
        ) : (
          <button
            onClick={() => onSendProposal && onSendProposal(match)}
            className={`btn btn-sm ${isPerfect ? 'btn-emerald' : 'btn-blue'}`}
          >
            <Repeat size={14} /> Send Exchange Proposal
          </button>
        )}
      </div>
    </div>
  );
}

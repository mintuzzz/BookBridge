import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ExchangeMatchCard from '../components/exchange/ExchangeMatchCard';
import ExchangeProposalCard from '../components/exchange/ExchangeProposalCard';
import { Repeat, Sparkles, PlusCircle, RefreshCw, Inbox, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ExchangePage() {
  const { user, isAuthenticated, token } = useAuth();
  const { showToast } = useNotification();
  const [matches, setMatches] = useState([]);
  const [myExchanges, setMyExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchError, setMatchError] = useState(null);

  const activeToken = token || localStorage.getItem('bb_token');
  const currentUserId = user?.id || user?._id;

  useEffect(() => {
    if (isAuthenticated && activeToken) {
      fetchMatches();
      fetchMyExchanges();
    } else {
      setMatches([]);
      setMyExchanges([]);
      setLoading(false);
      setMatchError(null);
    }

    const handleLiveExchangeUpdate = () => {
      console.log('⚡ Real-Time Exchange Event Triggered! Auto-refreshing exchanges list...');
      fetchMyExchanges();
      fetchMatches();
    };

    window.addEventListener('bb:exchange_updated', handleLiveExchangeUpdate);
    return () => {
      window.removeEventListener('bb:exchange_updated', handleLiveExchangeUpdate);
    };
  }, [isAuthenticated, activeToken]);

  const fetchMatches = async () => {
    if (!activeToken) return;
    setLoading(true);
    setMatchError(null);
    try {
      const res = await fetch('/api/exchanges/matches', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(Array.isArray(data) ? data : []);
      } else {
        setMatchError('Unable to load exchange matches. Please try again.');
      }
    } catch (err) {
      console.error('Fetch exchange matches error:', err);
      setMatchError('Unable to load exchange matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyExchanges = async () => {
    if (!activeToken) return;
    try {
      const res = await fetch('/api/exchanges/my-exchanges', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyExchanges(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch my exchanges error:', err);
    }
  };

  const handleSendProposal = async (match) => {
    if (!activeToken) {
      showToast('Please log in to send exchange proposals.', 'info');
      return;
    }

    try {
      const res = await fetch('/api/exchanges/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          offered_book_id: match.my_book.id,
          requested_book_id: match.target_book.id,
          match_level: match.match_level,
          match_reason: match.match_reason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send exchange proposal');

      showToast('🎉 Exchange proposal sent successfully!', 'success', 'Proposal Sent');
      fetchMyExchanges();
    } catch (err) {
      showToast(err.message, 'error', 'Proposal Failed');
    }
  };

  const handleAcceptProposal = async (proposalId) => {
    if (!activeToken) return;
    try {
      const res = await fetch(`/api/exchanges/${proposalId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept proposal');

      showToast('🎉 Exchange proposal accepted!', 'success', 'Accepted');
      fetchMyExchanges();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRejectProposal = async (proposalId) => {
    if (!activeToken) return;
    try {
      const res = await fetch(`/api/exchanges/${proposalId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject proposal');

      showToast('Exchange proposal declined.', 'info', 'Declined');
      fetchMyExchanges();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-emerald" style={{ marginBottom: '0.4rem' }}>
              <Sparkles size={14} /> Smart Reciprocal Matching Engine
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Book Exchange Hub</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Find reciprocal 100% matches and coordinate book swaps with verified students.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={fetchMatches} className="btn btn-outline btn-sm" style={{ gap: '0.35rem' }}>
              <RefreshCw size={14} /> Refresh Matches
            </button>
            <Link to="/sell" className="btn btn-emerald btn-sm" style={{ gap: '0.35rem' }}>
              <PlusCircle size={16} /> Post Book for Exchange
            </Link>
          </div>
        </div>

        {/* Section 1: Active Proposals & History */}
        {isAuthenticated && myExchanges.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Inbox size={20} color="var(--emerald-600)" /> Your Exchange Proposals ({myExchanges.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myExchanges.map((proposal) => (
                <ExchangeProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  currentUserId={currentUserId}
                  activeToken={activeToken}
                  onAccept={handleAcceptProposal}
                  onReject={handleRejectProposal}
                  onUpdate={fetchMyExchanges}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Intelligent Matches Grid */}
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Repeat size={20} color="var(--blue-600)" /> Smart Reciprocal Book Matches
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>Loading exchange matches...</div>
          ) : matchError ? (
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
              <AlertTriangle size={40} color="var(--rose-500)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ color: '#991b1b' }}>{matchError}</h3>
              <button onClick={fetchMatches} className="btn btn-rose" style={{ marginTop: '1.25rem' }}>
                Try Again
              </button>
            </div>
          ) : matches.length === 0 ? (
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <h3>No reciprocal matches found yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Post a book listing with your wanted book title to automatically trigger intelligent matching!
              </p>
              <Link to="/sell" className="btn btn-emerald" style={{ marginTop: '1.25rem' }}>
                Post an Exchange Listing
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {matches.map((match) => (
                <ExchangeMatchCard
                  key={match.id}
                  match={match}
                  onSendProposal={handleSendProposal}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

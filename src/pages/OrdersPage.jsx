import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ShoppingBag, Check, X, Clock, Calendar, CheckCircle2, XCircle, MessageSquare, Send, Sparkles, Key, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

function OrderCard({ order, currentUserId, activeToken, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  // Handover OTP States
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  // Schedule State
  const [meetingSpot, setMeetingSpot] = useState(order.meeting_spot || 'Central Library Grounds');
  const [proposedDate, setProposedDate] = useState(order.proposed_date || 'Aug 28');
  const [startTime, setStartTime] = useState(order.start_time || '1:00 PM');
  const [endTime, setEndTime] = useState(order.end_time || '2:00 PM');

  // Messages State
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const isSeller = currentUserId && (order.seller_id === currentUserId.toString());
  const isBuyer = currentUserId && (order.buyer_id === currentUserId.toString());
  const isParticipant = isSeller || isBuyer;

  const isPending = order.status === 'pending';
  const isAccepted = order.status === 'accepted';
  const isScheduled = order.status === 'scheduled';
  const isHandoverPending = order.status === 'handover_pending';
  const isCompleted = order.status === 'completed';
  const isRejected = order.status === 'rejected';

  const peerProposed = order.proposed_by && order.proposed_by.toString() !== currentUserId?.toString();
  const selfProposed = order.proposed_by && order.proposed_by.toString() === currentUserId?.toString();

  useEffect(() => {
    if (showMessages && activeToken) {
      fetchMessages();
    }
  }, [showMessages, activeToken]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {}
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeToken) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ message: newMessageText })
      });
      if (res.ok) {
        setNewMessageText('');
        fetchMessages();
      }
    } catch (e) {}
  };

  const handleVerifyHandoverOtpSubmit = async (e) => {
    e.preventDefault();
    if (!activeToken || !inputOtp) return;
    setLoading(true);
    setOtpError('');
    setOtpSuccess('');
    try {
      const res = await fetch(`/api/orders/${order.id}/verify-handover-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ otp: inputOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      setOtpSuccess(data.message);
      setInputOtp('');
      onRefresh();
    } catch (e) {
      setOtpError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!activeToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleProposeScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!activeToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/propose-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          meeting_spot: meetingSpot,
          proposed_date: proposedDate,
          start_time: startTime,
          end_time: endTime
        })
      });
      if (res.ok) {
        setShowScheduleForm(false);
        onRefresh();
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmScheduleClick = async () => {
    if (!activeToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm-schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const mainImage = order.images && order.images.length > 0
    ? order.images[0]
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        borderLeft: `5px solid ${isCompleted ? '#10b981' : isHandoverPending || isScheduled ? '#2563eb' : isAccepted ? '#8b5cf6' : isRejected ? '#ef4444' : '#f59e0b'}`,
        backgroundColor: 'white',
        marginBottom: '1rem'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            {order.order_number} · {new Date(order.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Status Badge */}
        <div>
          {isPending && (
            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Pending Response
            </span>
          )}
          {isAccepted && (
            <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} /> Request Accepted (Arrange Handover)
            </span>
          )}
          {isScheduled && (
            <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Handover Scheduled
            </span>
          )}
          {isHandoverPending && (
            <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Key size={12} /> Handover Code Active
            </span>
          )}
          {isCompleted && (
            <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Transaction Completed
            </span>
          )}
          {isRejected && (
            <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <XCircle size={12} /> Request Declined
            </span>
          )}
        </div>
      </div>

      {/* Book & User Info Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        <img
          src={mainImage}
          alt={order.book_title}
          style={{ width: '80px', height: '95px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-light)' }}
        />

        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>
            {order.book_title}
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            by {order.book_author} · {order.book_condition} Condition
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
            <strong>{isSeller ? `Buyer: ${order.buyer_name}` : `Seller: ${order.seller_name}`}</strong>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Amount</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--emerald-600)' }}>
            {order.total_amount === 0 ? 'FREE' : `₹${order.total_amount}`}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Pay via {order.payment_method?.toUpperCase()}</div>
        </div>
      </div>

      {/* Seller Action Buttons (Pending Only) */}
      {isSeller && isPending && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
          <button onClick={handleRejectRequest} disabled={loading} className="btn btn-sm btn-outline" style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
            <X size={14} /> Decline
          </button>
          <button onClick={handleAcceptRequest} disabled={loading} className="btn btn-sm btn-emerald">
            <Check size={14} /> Accept Request
          </button>
        </div>
      )}

      {/* SCHEDULING SECTION (ACCEPTED / SCHEDULED / HANDOVER_PENDING) */}
      {(isAccepted || isScheduled || isHandoverPending) && isParticipant && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={16} color="var(--blue-600)" /> Arrange Handover & Meeting
          </div>

          {/* Current Schedule Details */}
          {order.proposed_date && (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-dark)', marginBottom: '0.75rem', backgroundColor: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div><strong>Meeting Spot:</strong> {order.meeting_spot}</div>
              <div><strong>Proposed Date:</strong> {order.proposed_date}</div>
              <div><strong>Time Window:</strong> {order.start_time} – {order.end_time}</div>
            </div>
          )}

          {/* Peer Proposed Schedule: Peer needs to confirm or suggest another time */}
          {peerProposed && !isScheduled && !isHandoverPending && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <button onClick={handleConfirmScheduleClick} disabled={loading} className="btn btn-sm btn-emerald">
                <Check size={14} /> Accept Handover Schedule
              </button>
              <button onClick={() => setShowScheduleForm(!showScheduleForm)} className="btn btn-sm btn-outline">
                <Clock size={14} /> Suggest Another Time
              </button>
            </div>
          )}

          {/* Self Proposed Schedule: Waiting for peer to confirm */}
          {selfProposed && !isScheduled && !isHandoverPending && (
            <div style={{ fontSize: '0.8rem', color: 'var(--blue-700)', backgroundColor: '#eff6ff', padding: '0.6rem 0.85rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
              ⏳ Waiting for peer student to confirm proposed handover time.
            </div>
          )}

          {/* Initial Propose Schedule Button */}
          {!order.proposed_date && (
            <button onClick={() => setShowScheduleForm(!showScheduleForm)} className="btn btn-sm btn-blue" style={{ marginBottom: '0.5rem' }}>
              <Calendar size={14} /> Propose Meeting Time & Spot
            </button>
          )}

          {/* Schedule Form */}
          {(showScheduleForm || (!order.proposed_date && showScheduleForm)) && (
            <form onSubmit={handleProposeScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', backgroundColor: 'white', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Meeting Spot</label>
                  <input
                    type="text"
                    required
                    value={meetingSpot}
                    onChange={(e) => setMeetingSpot(e.target.value)}
                    placeholder="Central Library Grounds"
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Date</label>
                  <input
                    type="text"
                    required
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    placeholder="e.g. Aug 28"
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Start Time</label>
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="1:00 PM"
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>End Time</label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="2:00 PM"
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-sm btn-emerald" style={{ alignSelf: 'flex-start' }}>
                {loading ? 'Submitting...' : 'Submit Proposed Schedule'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* AUTOMATIC HANDOVER COMPLETION OTP SECTION */}
      {(isScheduled || isHandoverPending) && isParticipant && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={16} /> Physical Handover Verification Code
          </div>

          {otpError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem' }}>⚠️ {otpError}</div>}
          {otpSuccess && <div style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '0.5rem' }}>✅ {otpSuccess}</div>}

          {/* SELLER CODE DISPLAY (AUTOMATICALLY POPULATED) */}
          {isSeller && order.handover_code && (
            <div style={{ backgroundColor: 'white', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #93c5fd', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700 }}>
                🔑 Handover Code: <strong style={{ fontSize: '1.15rem', letterSpacing: '3px', color: '#1d4ed8' }}>{order.handover_code}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Share this code with the recipient after handing over the book.
              </div>
            </div>
          )}

          {/* BUYER VERIFY CODE FORM */}
          {isBuyer && (
            <form onSubmit={handleVerifyHandoverOtpSubmit} style={{ backgroundColor: 'white', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Enter the 6-digit handover code (Provided by book seller at meeting):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '320px' }}>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="──────"
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '1rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 700 }}
                />
                <button type="submit" disabled={loading || inputOtp.length !== 6} className="btn btn-sm btn-emerald">
                  {loading ? 'Verifying...' : 'Confirm Handover'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SHORT MESSAGES CHAT BOX */}
      {(isAccepted || isScheduled || isHandoverPending || isCompleted) && isParticipant && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            onClick={() => setShowMessages(!showMessages)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--blue-600)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <MessageSquare size={14} /> {showMessages ? 'Hide Transaction Messages' : 'Transaction Messages'}
          </button>

          {showMessages && (
            <div style={{ marginTop: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {messages.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>No messages yet. Send a message below!</div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === currentUserId?.toString();
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                          backgroundColor: isMine ? 'var(--emerald-600)' : 'white',
                          color: isMine ? 'white' : 'var(--text-dark)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '10px',
                          maxWidth: '80%',
                          fontSize: '0.8rem',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {m.message}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Can we meet near the library at 1:30?"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  style={{ flex: 1, padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                />
                <button type="submit" className="btn btn-sm btn-blue">
                  <Send size={14} /> Send
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeToken = localStorage.getItem('bb_token');
  const currentUserId = user?.id || user?._id;

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyOrders();
    } else {
      setLoading(false);
    }

    const handleLiveOrderUpdate = () => {
      console.log('⚡ Real-Time Order Event Triggered! Auto-refreshing orders list...');
      fetchMyOrders();
    };

    window.addEventListener('bb:order_updated', handleLiveOrderUpdate);
    return () => {
      window.removeEventListener('bb:order_updated', handleLiveOrderUpdate);
    };
  }, [isAuthenticated]);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <span className="badge badge-emerald" style={{ marginBottom: '0.4rem' }}>
            <ShoppingBag size={14} /> Real Campus Orders & Purchases
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Purchase Requests & Orders</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Track and arrange handover schedules for your book sales and purchases.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>Loading purchase requests...</div>
        ) : !isAuthenticated ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <h3>Log in to view your orders and purchase requests</h3>
            <Link to="/browse" className="btn btn-emerald" style={{ marginTop: '1rem' }}>Browse Books</Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <h3>No active purchase requests found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              When you request to buy books or receive purchase requests on your listings, they will appear here.
            </p>
            <Link to="/browse" className="btn btn-blue" style={{ marginTop: '1.5rem' }}>Browse Available Books</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                currentUserId={currentUserId}
                activeToken={activeToken}
                onRefresh={fetchMyOrders}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

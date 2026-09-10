import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ShoppingBag, Check, X, Clock, Calendar, CheckCircle2, XCircle, MessageSquare, Send, Sparkles, Key, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { validateScheduleInput } from '../utils/scheduleValidation';
import { safeFetchJson } from '../config/api';

function OrderCard({ order, currentUserId, activeToken, onRefresh, isHighlighted }) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  // Handover OTP States
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  // Schedule State
  const [meetingSpot, setMeetingSpot] = useState(order.meeting_spot || '');
  const [proposedDate, setProposedDate] = useState(order.proposed_date || '');
  const [startTime, setStartTime] = useState(order.start_time || '');
  const [endTime, setEndTime] = useState(order.end_time || '');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');

  // Messages State
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const ordId = (order.id || order._id)?.toString();

  useEffect(() => {
    setMeetingSpot(order.meeting_spot || '');
    setProposedDate(order.proposed_date || '');
    setStartTime(order.start_time || '');
    setEndTime(order.end_time || '');
  }, [order.meeting_spot, order.proposed_date, order.start_time, order.end_time]);

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
      if (!ordId) return;
      const data = await safeFetchJson(`/api/orders/${ordId}/messages`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeToken) return;
    try {
      if (!ordId) return;
      await safeFetchJson(`/api/orders/${ordId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ message: newMessageText })
      });
      setNewMessageText('');
      fetchMessages();
    } catch (e) {}
  };

  const handleVerifyHandoverOtpSubmit = async (e) => {
    e.preventDefault();
    if (!activeToken || !inputOtp) return;
    setLoading(true);
    setOtpError('');
    setOtpSuccess('');
    try {
      if (!ordId) throw new Error('Invalid order ID');
      const data = await safeFetchJson(`/api/orders/${ordId}/verify-handover-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ otp: inputOtp })
      });
      setOtpSuccess(data.message || 'Verification successful!');
      setInputOtp('');
      if (onRefresh) onRefresh();
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
      if (!ordId) return;
      const data = await safeFetchJson(`/api/orders/${ordId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      showToast(data.message || 'Purchase request accepted!', 'success');
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast(e.message || 'Failed to accept request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!activeToken) return;
    setLoading(true);
    try {
      if (!ordId) return;
      const data = await safeFetchJson(`/api/orders/${ordId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      showToast(data.message || 'Purchase request declined.', 'info');
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast(e.message || 'Failed to decline request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProposeScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!activeToken) return;

    if (!ordId) {
      showToast('Invalid order ID.', 'error');
      return;
    }

    // Validate form fields
    const validationError = validateScheduleInput({
      meetingSpot,
      proposedDate,
      startTime,
      endTime
    });

    if (validationError) {
      setScheduleError(validationError);
      showToast(validationError, 'error', 'Validation Error');
      return;
    }

    setLoading(true);
    setScheduleError('');
    setScheduleSuccess('');

    try {
      const data = await safeFetchJson(`/api/orders/${ordId}/propose-schedule`, {
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

      setScheduleSuccess('Schedule Proposed ✓');
      showToast(data.message || 'Meeting schedule proposed successfully.', 'success', 'Schedule Proposed');
      setShowScheduleForm(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setScheduleError(err.message || 'Unable to propose the meeting schedule. Please try again.');
      showToast(err.message || 'Unable to propose the meeting schedule. Please try again.', 'error', 'Schedule Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmScheduleClick = async () => {
    if (!activeToken) return;
    if (!ordId) return;
    setLoading(true);
    try {
      const data = await safeFetchJson(`/api/orders/${ordId}/confirm-schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      showToast(data.message || 'Handover meeting schedule confirmed successfully!', 'success');
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast(e.message || 'Failed to confirm schedule.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resolveImageUrl = (img) => {
    if (!img || typeof img !== 'string') return null;
    const trimmed = img.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) return trimmed;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  };

  const mainImage = resolveImageUrl(order.images && order.images.length > 0 ? order.images[0] : null);

  return (
    <div
      id={`order_${ordId}`}
      className="card"
      style={{
        padding: '1.25rem',
        borderLeft: `5px solid ${isCompleted ? '#10b981' : isHandoverPending || isScheduled ? '#2563eb' : isAccepted ? '#8b5cf6' : isRejected ? '#ef4444' : '#f59e0b'}`,
        backgroundColor: isHighlighted ? '#f0f9ff' : 'white',
        border: isHighlighted ? '2px solid #2563eb' : undefined,
        marginBottom: '1rem',
        transition: 'all 0.3s ease'
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
          {isAccepted && !order.proposed_date && (
            <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} /> Request Accepted (Arrange Handover)
            </span>
          )}
          {isAccepted && order.proposed_date && !isScheduled && !isHandoverPending && (
            <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} /> Proposed Meeting ({selfProposed ? 'Waiting for confirmation' : 'Requires Action'})
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
              <XCircle size={12} /> Declined
            </span>
          )}
        </div>
      </div>

      {/* Book & Order Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        {/* Image Preview / Placeholder */}
        {mainImage ? (
          <img
            src={mainImage}
            alt={order.book_title}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';
            }}
            style={{ width: '64px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
          />
        ) : (
          <div style={{ width: '64px', height: '80px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <ShoppingBag size={20} />
            <span style={{ fontSize: '0.65rem', marginTop: '4px' }}>No Image</span>
          </div>
        )}

        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-dark)' }}>{order.book_title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isBuyer ? `Seller: ${order.seller_name}` : `Buyer: ${order.buyer_name}`}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--emerald-600)' }}>
            ₹{order.total_amount}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Pay via {(order.payment_method || 'Cash').toUpperCase()}</div>
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

          {/* Current Saved Proposed Schedule Details */}
          {order.proposed_date && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.75rem', backgroundColor: 'white', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--blue-700)' }}>Proposed Meeting</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                📍 <strong>Spot:</strong> {order.meeting_spot}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                📅 <strong>Date:</strong> {order.proposed_date}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                🕐 <strong>Time Window:</strong> {order.start_time} – {order.end_time}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isScheduled || isHandoverPending ? 'var(--emerald-600)' : 'var(--amber-600)' }}>
                Status: {isScheduled || isHandoverPending ? 'Confirmed ✓' : 'Pending Confirmation'}
              </div>
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
              {scheduleError && (
                <div style={{ fontSize: '0.8rem', color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={14} /> {scheduleError}
                </div>
              )}
              {scheduleSuccess && (
                <div style={{ fontSize: '0.8rem', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #86efac' }}>
                  {scheduleSuccess}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Meeting Spot *</label>
                  <input
                    type="text"
                    required
                    value={meetingSpot}
                    onChange={(e) => setMeetingSpot(e.target.value)}
                    placeholder="College Library Grounds"
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Date *</label>
                  <input
                    type="date"
                    required
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>End Time *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
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

          {/* SENDER CODE DISPLAY (AUTOMATICALLY POPULATED) */}
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
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeToken = localStorage.getItem('bb_token');
  const currentUserId = user?.id || user?._id;

  const queryParams = new URLSearchParams(location.search);
  const targetOrderId = queryParams.get('orderId') || queryParams.get('id');

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
  }, [isAuthenticated, location]);

  useEffect(() => {
    if (targetOrderId && orders.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`order_${targetOrderId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [targetOrderId, orders]);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setOrders(Array.isArray(data) ? data : []);
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
            {orders.map((order) => {
              const ordId = (order.id || order._id)?.toString();
              return (
                <OrderCard
                  key={ordId}
                  order={order}
                  currentUserId={currentUserId}
                  activeToken={activeToken}
                  onRefresh={fetchMyOrders}
                  isHighlighted={targetOrderId === ordId}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Repeat, Check, X, ArrowRightLeft, Clock, CheckCircle2, XCircle, Calendar, MapPin, MessageSquare, Send, Sparkles, Key, ShieldCheck } from 'lucide-react';

export default function ExchangeProposalCard({ proposal, currentUserId, activeToken, onAccept, onReject, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  // Handover OTP States
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  // Schedule Inputs
  const [meetingSpot, setMeetingSpot] = useState(proposal.meeting_spot || 'Central Library Grounds');
  const [proposedDate, setProposedDate] = useState(proposal.proposed_date || 'Aug 28');
  const [startTime, setStartTime] = useState(proposal.start_time || '1:00 PM');
  const [endTime, setEndTime] = useState(proposal.end_time || '2:00 PM');

  // Messages State
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const isRecipient = currentUserId && (proposal.owner_id === currentUserId.toString());
  const isSender = currentUserId && (proposal.requester_id === currentUserId.toString());
  const isParticipant = isRecipient || isSender;

  const isPending = proposal.status === 'pending';
  const isAccepted = proposal.status === 'accepted';
  const isScheduled = proposal.status === 'scheduled';
  const isHandoverPending = proposal.status === 'handover_pending';
  const isCompleted = proposal.status === 'completed';
  const isRejected = proposal.status === 'rejected';

  const peerProposed = proposal.proposed_by && proposal.proposed_by.toString() !== currentUserId?.toString();
  const selfProposed = proposal.proposed_by && proposal.proposed_by.toString() === currentUserId?.toString();

  useEffect(() => {
    if (showMessages && activeToken) {
      fetchMessages();
    }
  }, [showMessages, activeToken]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/exchanges/${proposal.id}/messages`, {
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
      const res = await fetch(`/api/exchanges/${proposal.id}/messages`, {
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
      const res = await fetch(`/api/exchanges/${proposal.id}/verify-handover-otp`, {
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
      if (onUpdate) onUpdate();
    } catch (e) {
      setOtpError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProposeScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!activeToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/exchanges/${proposal.id}/propose-schedule`, {
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
        if (onUpdate) onUpdate();
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
      const res = await fetch(`/api/exchanges/${proposal.id}/confirm-schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        if (onUpdate) onUpdate();
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isRecipient ? (
            <span className="badge badge-blue" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              <Repeat size={14} /> Incoming Exchange Proposal
            </span>
          ) : (
            <span className="badge badge-emerald" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              <Repeat size={14} /> Proposal Sent to {proposal.owner_name}
            </span>
          )}
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
              <Calendar size={12} /> Proposal Accepted (Arrange Schedule)
            </span>
          )}
          {isScheduled && (
            <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Scheduled
            </span>
          )}
          {isHandoverPending && (
            <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Key size={12} /> Handover Code Active
            </span>
          )}
          {isCompleted && (
            <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Exchange Completed
            </span>
          )}
          {isRejected && (
            <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <XCircle size={12} /> Declined
            </span>
          )}
        </div>
      </div>

      {/* Books Swap Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        {/* Offered Book */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--emerald-700)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            {isRecipient ? `Offered by ${proposal.requester_name}` : 'You Offer'}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
            {proposal.offered_book?.title || 'Textbook'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {proposal.offered_book?.department} · Sem {proposal.offered_book?.semester}
          </div>
        </div>

        {/* Arrow Icon */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: isCompleted || isScheduled || isHandoverPending ? 'var(--emerald-500)' : 'var(--blue-600)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ArrowRightLeft size={18} />
        </div>

        {/* Requested Book */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--blue-700)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            {isRecipient ? 'Your Book They Want' : `Requested from ${proposal.owner_name}`}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
            {proposal.requested_book?.title || 'Textbook'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {proposal.requested_book?.department} · Sem {proposal.requested_book?.semester}
          </div>
        </div>
      </div>

      {/* Recipient Action Buttons (Pending Only) */}
      {isRecipient && isPending && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
          <button
            onClick={() => onReject(proposal.id)}
            disabled={loading}
            className="btn btn-sm btn-outline"
            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
          >
            <X size={14} /> Reject
          </button>
          <button
            onClick={() => onAccept(proposal.id)}
            disabled={loading}
            className="btn btn-sm btn-emerald"
          >
            <Check size={14} /> Accept Proposal
          </button>
        </div>
      )}

      {/* SCHEDULING SECTION (ACCEPTED / SCHEDULED / HANDOVER_PENDING) */}
      {(isAccepted || isScheduled || isHandoverPending) && isParticipant && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={16} color="var(--blue-600)" /> Arrange Meeting & Schedule
          </div>

          {/* Current Schedule Details */}
          {proposal.proposed_date && (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-dark)', marginBottom: '0.75rem', backgroundColor: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div><strong>Meeting Spot:</strong> {proposal.meeting_spot}</div>
              <div><strong>Proposed Date:</strong> {proposal.proposed_date}</div>
              <div><strong>Time Window:</strong> {proposal.start_time} – {proposal.end_time}</div>
            </div>
          )}

          {/* Peer Proposed Schedule: Peer needs to confirm or suggest another time */}
          {peerProposed && !isScheduled && !isHandoverPending && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <button onClick={handleConfirmScheduleClick} disabled={loading} className="btn btn-sm btn-emerald">
                <Check size={14} /> Accept Schedule
              </button>
              <button onClick={() => setShowScheduleForm(!showScheduleForm)} className="btn btn-sm btn-outline">
                <Clock size={14} /> Suggest Another Time
              </button>
            </div>
          )}

          {/* Self Proposed Schedule: Waiting for peer to confirm */}
          {selfProposed && !isScheduled && !isHandoverPending && (
            <div style={{ fontSize: '0.8rem', color: 'var(--blue-700)', backgroundColor: '#eff6ff', padding: '0.6rem 0.85rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
              ⏳ Waiting for peer student to confirm your proposed schedule. You can also update proposed details below:
            </div>
          )}

          {/* Initial Propose Schedule Button */}
          {!proposal.proposed_date && (
            <button onClick={() => setShowScheduleForm(!showScheduleForm)} className="btn btn-sm btn-blue" style={{ marginBottom: '0.5rem' }}>
              <Calendar size={14} /> Propose Meeting Time & Spot
            </button>
          )}

          {/* Schedule Form */}
          {(showScheduleForm || (!proposal.proposed_date && showScheduleForm)) && (
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

          {/* SENDER/PROVIDER CODE DISPLAY (AUTOMATICALLY POPULATED) */}
          {isRecipient ? (
            /* Wait: For Exchange, both users send a book. Owner is Provider 1, Requester is Provider 2. Sender sees their handover code */
            proposal.handover_code ? (
              <div style={{ backgroundColor: 'white', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #93c5fd', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700 }}>
                  🔑 Handover Code: <strong style={{ fontSize: '1.15rem', letterSpacing: '3px', color: '#1d4ed8' }}>{proposal.handover_code}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Share this code with the recipient after handing over the book.
                </div>
              </div>
            ) : null
          ) : (
            proposal.handover_code ? (
              <div style={{ backgroundColor: 'white', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #93c5fd', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700 }}>
                  🔑 Handover Code: <strong style={{ fontSize: '1.15rem', letterSpacing: '3px', color: '#1d4ed8' }}>{proposal.handover_code}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Share this code with the recipient after handing over the book.
                </div>
              </div>
            ) : null
          )}

          {/* RECIPIENT VERIFY CODE FORM */}
          <form onSubmit={handleVerifyHandoverOtpSubmit} style={{ backgroundColor: 'white', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Enter the 6-digit handover code (Provided by book seller/partner at meeting):
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
            <MessageSquare size={14} /> {showMessages ? 'Hide Exchange Messages' : 'Exchange Messages'}
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

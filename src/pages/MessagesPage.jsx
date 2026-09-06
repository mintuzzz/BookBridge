import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { MessageSquare, Send, User, MapPin } from 'lucide-react';

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotification();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
    }
  }, [activeConv]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('bb_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const safeConvs = Array.isArray(data) ? data : [];
        setConversations(safeConvs);
        if (safeConvs.length > 0) setActiveConv(safeConvs[0]);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const res = await fetch(`/api/messages/${convId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bb_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {}
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConv) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({
          conversation_id: activeConv.id,
          receiver_id: activeConv.other_user.id,
          text: text.trim()
        })
      });

      const newMsg = await res.json();
      if (!res.ok) throw new Error(newMsg.error);

      setMessages((prev) => [...prev, newMsg]);
      setText('');
    } catch (err) {
      showToast('Failed to send message.', 'error');
    }
  };

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem' }}>In-App Campus Messaging</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chat securely with transaction partners to coordinate campus pickup times and spot locations.</p>
        </div>

        {!isAuthenticated ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>Please log in to view messages.</div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <MessageSquare size={48} color="var(--emerald-600)" style={{ margin: '0 auto 1rem' }} />
            <h3>No Conversations Yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Conversations start automatically when you reserve a book or send an exchange proposal.</p>
          </div>
        ) : (
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '540px', overflow: 'hidden' }}>
            {/* Conversation List Column */}
            <div style={{ borderRight: '1px solid var(--border-light)', overflowY: 'auto' }}>
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveConv(c)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    backgroundColor: activeConv?.id === c.id ? 'var(--emerald-50)' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {c.other_user.avatar ? (
                      <img
                        src={c.other_user.avatar}
                        alt={c.other_user.name}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--emerald-100)', color: 'var(--emerald-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                        {c.other_user.name ? c.other_user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{c.other_user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--emerald-700)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.book_title || 'Book Trade'}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.last_message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Messages Column */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header */}
              {activeConv && (
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {activeConv.other_user.avatar ? (
                    <img
                      src={activeConv.other_user.avatar}
                      alt={activeConv.other_user.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                    />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--emerald-100)', color: 'var(--emerald-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                      {activeConv.other_user.name ? activeConv.other_user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{activeConv.other_user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Context: {activeConv.book_title}</div>
                  </div>
                </div>
              )}

              {/* Message History Container */}
              <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.map((m) => {
                  const isMe = m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        backgroundColor: isMe ? 'var(--emerald-600)' : 'var(--bg-secondary)',
                        color: isMe ? 'white' : 'var(--text-dark)',
                        padding: '0.65rem 1rem',
                        borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        maxWidth: '70%',
                        fontSize: '0.875rem'
                      }}
                    >
                      {m.text}
                    </div>
                  );
                })}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.65rem' }}>
                <input
                  type="text"
                  placeholder="Type your message about campus pickup time & spot..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-light)', outline: 'none' }}
                />
                <button type="submit" className="btn btn-emerald btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                  <Send size={16} /> Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { HelpCircle, Plus, Search, MapPin, User, CheckCircle2 } from 'lucide-react';

export default function RequestsPage() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useNotification();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [semester, setSemester] = useState('3');
  const [preferredPrice, setPreferredPrice] = useState('300');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showToast('Please log in to post a book request.', 'info');
      return;
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({
          title,
          author,
          subject,
          department,
          semester,
          preferred_price: preferredPrice,
          description
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('🎉 Wanted book request posted to campus board!', 'success', 'Request Created');
      setShowModal(false);
      setTitle('');
      fetchRequests();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-emerald" style={{ marginBottom: '0.4rem' }}>
              <HelpCircle size={14} /> Student Wanted Board
            </span>
            <h1 style={{ fontSize: '1.8rem' }}>Student Book Requests</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Can't find a textbook on the marketplace? Post a wanted request so student sellers can contact you directly!
            </p>
          </div>

          <button onClick={() => setShowModal(true)} className="btn btn-emerald">
            <Plus size={18} /> Post a Book Request
          </button>
        </div>

        {/* Requests Board */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading wanted book requests...</div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <HelpCircle size={48} color="var(--emerald-600)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Active Requests</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Be the first student to post a request for missing coursebooks.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {requests.map((r) => (
              <div key={r.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <span className="badge badge-blue">{r.department}</span>
                    <span className="badge badge-emerald">Sem {r.semester}</span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-dark)' }}>{r.title}</h3>
                  {r.author && <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>by {r.author}</p>}

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-medium)', marginBottom: '1rem', lineHeight: 1.5 }}>
                    "{r.description || 'Looking for an affordable used copy for upcoming coursework.'}"
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Budget</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--emerald-600)' }}>
                      {r.preferred_price > 0 ? `₹${r.preferred_price}` : 'Flexible'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {r.requester_avatar ? (
                      <img
                        src={r.requester_avatar}
                        alt={r.requester_name}
                        style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                      />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--emerald-100)', color: 'var(--emerald-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                        {r.requester_name ? r.requester_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.requester_name ? r.requester_name.split(' ')[0] : 'Student'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post Request Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>Post a Wanted Book Request</h2>
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Patterns"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Management">Management</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Semester *</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineering"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Preferred Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 300"
                    value={preferredPrice}
                    onChange={(e) => setPreferredPrice(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes about edition preference or urgency..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <button type="submit" className="btn btn-emerald btn-lg" style={{ width: '100%', marginTop: '0.5rem' }}>
                Publish Request to Board
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

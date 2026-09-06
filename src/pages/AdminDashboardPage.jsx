import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ShieldAlert, Users, BookOpen, ShoppingBag, Flag, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'listings', 'transactions', 'reports'
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [listingsList, setListingsList] = useState([]);
  const [transactionsList, setTransactionsList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      showToast('Access denied. Admin privileges required.', 'error');
      navigate('/');
      return;
    }
    fetchAdminData();
  }, [isAdmin]);

  const fetchAdminData = async () => {
    setLoading(true);
    const token = localStorage.getItem('bb_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [resStats, resUsers, resListings, resTxns, resReports] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/listings', { headers }),
        fetch('/api/admin/transactions', { headers }),
        fetch('/api/admin/reports', { headers })
      ]);

      if (resStats.ok) setStats(await resStats.json());
      if (resUsers.ok) setUsersList(await resUsers.json());
      if (resListings.ok) setListingsList(await resListings.json());
      if (resTxns.ok) setTransactionsList(await resTxns.json());
      if (resReports.ok) setReportsList(await resReports.json());
    } catch (err) {
      showToast('Failed to load admin data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`User status updated to ${newStatus}.`, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleListingStatus = async (listingId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Listing status updated to ${newStatus}.`, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResolveReport = async (reportId) => {
    const action = prompt('Admin Action Rationale (e.g. Warning Issued, Listing Removed):');
    if (!action) return;

    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({ admin_action: action, status: 'resolved' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Report resolved.', 'success');
      fetchAdminData();
    } catch (err) {
      showToast('Failed to resolve report.', 'error');
    }
  };

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading Admin Control Center...</div>;

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        {/* Admin Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-rose"><ShieldAlert size={14} /> Protected Admin Console</span>
            </div>
            <h1 style={{ fontSize: '1.8rem' }}>BookBridge Control Center</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor transactions, manage users, moderate listings, and resolve safety reports.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
          <button onClick={() => setActiveTab('overview')} className={`btn btn-sm ${activeTab === 'overview' ? 'btn-blue' : 'btn-outline'}`}>
            Overview Stats
          </button>
          <button onClick={() => setActiveTab('users')} className={`btn btn-sm ${activeTab === 'users' ? 'btn-blue' : 'btn-outline'}`}>
            <Users size={14} /> Users ({usersList.length})
          </button>
          <button onClick={() => setActiveTab('listings')} className={`btn btn-sm ${activeTab === 'listings' ? 'btn-blue' : 'btn-outline'}`}>
            <BookOpen size={14} /> Listings ({listingsList.length})
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`btn btn-sm ${activeTab === 'transactions' ? 'btn-blue' : 'btn-outline'}`}>
            <ShoppingBag size={14} /> Transactions ({transactionsList.length})
          </button>
          <button onClick={() => setActiveTab('reports')} className={`btn btn-sm ${activeTab === 'reports' ? 'btn-rose' : 'btn-outline'}`}>
            <Flag size={14} /> Reports ({reportsList.filter((r) => r.status === 'pending').length})
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registered Students</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--blue-600)', marginTop: '4px' }}>{stats.users}</div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Book Listings</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--emerald-600)', marginTop: '4px' }}>{stats.listings}</div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Books Sold & Reused</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--amber-600)', marginTop: '4px' }}>{stats.sold_books}</div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed Handovers</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--emerald-600)', marginTop: '4px' }}>{stats.completed_orders}</div>
              </div>
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Student</th>
                  <th style={{ padding: '0.75rem' }}>Department</th>
                  <th style={{ padding: '0.75rem' }}>Eco Points</th>
                  <th style={{ padding: '0.75rem' }}>Rating</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                      {u.full_name} <br />
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>{u.email}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{u.department} (Sem {u.semester})</td>
                    <td style={{ padding: '0.75rem', color: 'var(--emerald-600)', fontWeight: 700 }}>🌱 {u.eco_points}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--amber-600)', fontWeight: 700 }}>★ {u.rating}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${u.status === 'active' ? 'badge-emerald' : 'badge-rose'}`}>{u.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {u.role !== 'admin' && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {u.status === 'active' ? (
                            <button onClick={() => handleToggleUserStatus(u.id, 'suspended')} className="btn btn-sm btn-outline" style={{ fontSize: '0.75rem', color: 'var(--rose-500)' }}>
                              Suspend
                            </button>
                          ) : (
                            <button onClick={() => handleToggleUserStatus(u.id, 'active')} className="btn btn-sm btn-emerald" style={{ fontSize: '0.75rem' }}>
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LISTINGS MODERATION TAB */}
        {activeTab === 'listings' && (
          <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Book Title</th>
                  <th style={{ padding: '0.75rem' }}>Seller</th>
                  <th style={{ padding: '0.75rem' }}>Type & Price</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {listingsList.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                      {b.title} <br />
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>{b.department}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{b.seller_name}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {(b.transaction_type || b.transactionType || 'BUY').toUpperCase()} · { (b.transaction_type || b.transactionType) === 'donate' ? 'FREE' : (b.transaction_type || b.transactionType) === 'exchange' ? 'Exchange' : `₹${b.selling_price ?? b.sellingPrice ?? 0}` }
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${b.status === 'available' ? 'badge-emerald' : 'badge-amber'}`}>{b.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {b.status === 'available' ? (
                        <button onClick={() => handleToggleListingStatus(b.id, 'hidden')} className="btn btn-sm btn-outline" style={{ fontSize: '0.75rem', color: 'var(--rose-500)' }}>
                          Hide Listing
                        </button>
                      ) : (
                        <button onClick={() => handleToggleListingStatus(b.id, 'available')} className="btn btn-sm btn-emerald" style={{ fontSize: '0.75rem' }}>
                          Unhide
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TRANSACTIONS LOG TAB */}
        {activeTab === 'transactions' && (
          <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Order #</th>
                  <th style={{ padding: '0.75rem' }}>Book</th>
                  <th style={{ padding: '0.75rem' }}>Buyer / Seller</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Payment</th>
                </tr>
              </thead>
              <tbody>
                {transactionsList.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, fontFamily: 'monospace' }}>{t.order_number}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>{t.book_title}</td>
                    <td style={{ padding: '0.75rem' }}>
                      Buyer: {t.buyer_name} <br />
                      Seller: {t.seller_name}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${t.status === 'completed' ? 'badge-emerald' : 'badge-amber'}`}>{t.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>₹{t.total_amount} ({t.payment_status})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORTS & SAFETY TAB */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reportsList.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No reports filed.</div>
            ) : (
              reportsList.map((r) => (
                <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`badge ${r.status === 'pending' ? 'badge-rose' : 'badge-emerald'}`}>
                      {r.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Reported by {r.reporter_name}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Reason: {r.reason}</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{r.description}</p>
                  {r.admin_action && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--emerald-700)', fontWeight: 600, marginTop: '8px', backgroundColor: 'var(--emerald-50)', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
                      Action Taken: {r.admin_action}
                    </div>
                  )}

                  {r.status === 'pending' && (
                    <button onClick={() => handleResolveReport(r.id)} className="btn btn-emerald btn-sm" style={{ marginTop: '0.75rem' }}>
                      Resolve Report
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { User, Leaf, Star, BookOpen, Repeat, Gift, Edit, ShieldCheck, Award } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser, isAuthenticated } = useAuth();
  const { showToast } = useNotification();

  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || 'Computer Science');
  const [semester, setSemester] = useState(user?.semester || '5');
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || '');
      setDepartment(user.department);
      setSemester(user.semester);
      fetchMyListings();
    }
  }, [user]);

  const fetchMyListings = async () => {
    try {
      const res = await fetch(`/api/books?seller_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setMyListings(data.filter((b) => b.seller_id === user.id));
      }
    } catch (err) {}
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          department,
          semester
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      updateUser(data.user);
      showToast('Profile updated successfully!', 'success');
      setEditMode(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (!isAuthenticated || !user) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Please log in to view your profile.</div>;

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container">
        {/* Profile Banner Card */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={user.full_name}
              style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--emerald-500)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{user.full_name}</h1>
                <span className="badge badge-emerald"><ShieldCheck size={14} /> Verified Student</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
                {user.department} · Semester {user.semester} | {user.institution}
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span className="badge badge-amber" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <Star size={14} fill="var(--amber-500)" stroke="none" /> {user.rating || 4.8} Rating
                </span>
                <span className="badge badge-emerald" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <Leaf size={14} /> 🌱 {user.eco_points || 50} Eco Points
                </span>
                <span className="badge badge-blue" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  <Award size={14} /> Eco Champion Level 2
                </span>
              </div>
            </div>

            <button onClick={() => setEditMode(!editMode)} className="btn btn-outline btn-sm">
              <Edit size={14} /> {editMode ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* Edit Profile Form */}
          {editMode && (
            <form onSubmit={handleUpdateProfile} style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Department</label>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Semester</label>
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

              <button type="submit" className="btn btn-emerald btn-sm" style={{ gridColumn: '1 / -1', justifySelf: 'start' }}>
                Save Changes
              </button>
            </form>
          )}
        </div>

        {/* Overview Stats Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <BookOpen size={28} color="var(--emerald-600)" style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{myListings.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Listed Books</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <Repeat size={28} color="var(--blue-600)" style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>4</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Swaps & Exchanges</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <Gift size={28} color="var(--amber-500)" style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>3</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Free Donations</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <Leaf size={28} color="var(--emerald-600)" style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{user.eco_points}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Eco Points</div>
          </div>
        </div>

        {/* My Active Listings Section */}
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>My Active Book Listings</h3>
          {myListings.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              You haven't listed any books yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.25rem' }}>
              {myListings.map((b) => (
                <div key={b.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.transaction_type.toUpperCase()} · ₹{b.selling_price}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--emerald-600)', fontWeight: 600, marginTop: '4px' }}>Status: {b.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

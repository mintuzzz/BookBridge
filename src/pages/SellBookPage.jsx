import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { PlusCircle, Upload, Tag, Repeat, Gift, MapPin, Sparkles, X, Image as ImageIcon } from 'lucide-react';

export default function SellBookPage() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const { showToast } = useNotification();

  const [transactionType, setTransactionType] = useState('buy'); // 'buy', 'exchange', 'donate'
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [edition, setEdition] = useState('');
  const [isbn, setIsbn] = useState('');
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [semester, setSemester] = useState('3');
  const [condition, setCondition] = useState('Very Good');
  const [originalPrice, setOriginalPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [location, setLocation] = useState('Central Library Grounds');
  const [description, setDescription] = useState('');
  const [wantedBookTitle, setWantedBookTitle] = useState('');

  // Image Upload States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (selectedFiles.length + files.length > 3) {
      showToast('Maximum 3 images allowed per book listing.', 'warning');
      return;
    }

    const validFiles = [];
    const newPreviews = [...previews];

    for (const file of files) {
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        showToast(`Invalid file format for "${file.name}". Only JPG, JPEG, PNG, and WEBP allowed.`, 'error');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`"${file.name}" exceeds the 5MB file size limit.`, 'error');
        continue;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles([...selectedFiles, ...validFiles]);
    setPreviews(newPreviews);
  };

  const handleRemoveImage = (index) => {
    const updatedFiles = [...selectedFiles];
    const updatedPreviews = [...previews];

    URL.revokeObjectURL(updatedPreviews[index]);

    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const activeToken = token || localStorage.getItem('bb_token');
    if (!isAuthenticated || !activeToken) {
      showToast('Please log in to list a book on BookBridge.', 'info');
      return;
    }

    setLoading(true);
    try {
      let uploadedUrls = [];

      // 1. Upload Images to Backend Server if selected
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('images', file));

        const uploadRes = await fetch('/api/upload/images', {
          method: 'POST',
          headers: { Authorization: `Bearer ${activeToken}` },
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload book images.');
        uploadedUrls = uploadData.urls || [];
      }

      // 2. Publish Book Listing with Uploaded Image URLs
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          title,
          author,
          edition,
          isbn,
          subject,
          department,
          semester,
          condition,
          original_price: originalPrice,
          selling_price: sellingPrice,
          transaction_type: transactionType,
          location,
          description,
          wanted_book_title: wantedBookTitle,
          images: uploadedUrls
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to Create Listing');

      const bookId = data.book?.id || data.book?._id;
      showToast('🎉 Your book with uploaded photos has been published!', 'success', 'Listing Published (+20 Eco Points)');
      if (bookId) {
        navigate(`/books/${bookId}`);
      } else {
        navigate('/browse');
      }
    } catch (err) {
      showToast(err.message, 'error', 'Failed to Create Listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '3rem 0' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="badge badge-emerald" style={{ marginBottom: '0.5rem', padding: '0.35rem 0.75rem' }}>
            <Sparkles size={14} /> Earn +20 Eco Points Per Listing
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>List a Book on BookBridge</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '4px' }}>
            Give your past semester textbooks a second life in your campus community.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. Transaction Type selector */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem', display: 'block' }}>
              What do you want to do with this book? *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setTransactionType('buy')}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '12px',
                  border: transactionType === 'buy' ? '2px solid var(--emerald-500)' : '1px solid var(--border-light)',
                  backgroundColor: transactionType === 'buy' ? '#f0fdf4' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Tag size={20} color={transactionType === 'buy' ? 'var(--emerald-600)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: transactionType === 'buy' ? 'var(--emerald-700)' : 'var(--text-dark)' }}>Sell Book</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Set your resale price</span>
              </button>

              <button
                type="button"
                onClick={() => setTransactionType('exchange')}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '12px',
                  border: transactionType === 'exchange' ? '2px solid var(--blue-500)' : '1px solid var(--border-light)',
                  backgroundColor: transactionType === 'exchange' ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Repeat size={20} color={transactionType === 'exchange' ? 'var(--blue-600)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: transactionType === 'exchange' ? 'var(--blue-700)' : 'var(--text-dark)' }}>Exchange</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Swap for another book</span>
              </button>

              <button
                type="button"
                onClick={() => setTransactionType('donate')}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '12px',
                  border: transactionType === 'donate' ? '2px solid #a855f7' : '1px solid var(--border-light)',
                  backgroundColor: transactionType === 'donate' ? '#faf5ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Gift size={20} color={transactionType === 'donate' ? '#9333ea' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: transactionType === 'donate' ? '#7e22ce' : 'var(--text-dark)' }}>Donate Free</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Give to junior students</span>
              </button>
            </div>
          </div>

          {/* 2. REAL BOOK IMAGE UPLOAD SECTION (1-3 Photos) */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-light)', borderRadius: '12px', padding: '1.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ImageIcon size={16} color="var(--emerald-600)" /> Upload Book Photos (1–3 Images)
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Recommended: Front cover, back/inside page, and condition/damage photo (JPG, JPEG, PNG, WEBP — Max 5MB each).
            </p>

            {/* Thumbnail Previews Grid */}
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                {previews.map((previewUrl, idx) => (
                  <div key={idx} style={{ position: 'relative', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    <img src={previewUrl} alt={`Book Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                    <div style={{ position: 'absolute', bottom: '0', inset: 'auto 0 0 0', backgroundColor: 'rgba(15,23,42,0.7)', color: 'white', fontSize: '0.65rem', textAlign: 'center', padding: '2px 0' }}>
                      {idx === 0 ? 'Primary Thumbnail' : `Photo ${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {selectedFiles.length < 3 && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'white',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  color: 'var(--blue-600)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Upload size={16} /> Choose Image Files ({selectedFiles.length}/3)
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {/* Book Details Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Book Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Operating System Concepts"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Author(s) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Silberschatz, Galvin"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Subject *</label>
              <input
                type="text"
                required
                placeholder="Operating Systems"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Engineering">Engineering</option>
                <option value="Medicine">Medicine</option>
                <option value="Commerce">Commerce</option>
                <option value="Management">Management</option>
                <option value="Arts">Arts</option>
                <option value="Science">Science</option>
                <option value="Law">Law</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Semester *</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Condition *</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}
              >
                <option value="Like New">Like New</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Acceptable">Acceptable</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Edition</label>
              <input
                type="text"
                placeholder="e.g. 10th Edition"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>ISBN Number</label>
              <input
                type="text"
                placeholder="e.g. 978-1118063330"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>

          {/* Pricing fields for Sell */}
          {transactionType === 'buy' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Original MRP (₹)</label>
                <input
                  type="number"
                  placeholder="890"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Resale Price (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="350"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>
            </div>
          )}

          {/* Wanted Book Title for Exchange */}
          {transactionType === 'exchange' && (
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Which book do you want in return? *</label>
              <input
                type="text"
                required
                placeholder="e.g. Computer Networking: A Top-Down Approach"
                value={wantedBookTitle}
                onChange={(e) => setWantedBookTitle(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>
          )}

          {/* Location & Description */}
          <div>
            <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Campus Pickup Location *</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                placeholder="e.g. CS Department Block B or Central Library"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.4rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Description & Book Notes</label>
            <textarea
              rows={3}
              placeholder="Highlight any markings, highlighted pages, or extra study materials included with this book..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontFamily: 'inherit' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-emerald btn-lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Publishing Book Listing...' : 'Publish Book Listing (+20 Eco Points)'}
          </button>
        </form>
      </div>
    </div>
  );
}

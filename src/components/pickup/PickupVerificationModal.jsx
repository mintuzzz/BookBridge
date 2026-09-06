import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import confetti from 'canvas-confetti';
import { X, ShieldCheck, QrCode, Key, CheckCircle2, AlertCircle } from 'lucide-react';

import { safeFetchJson } from '../../config/api';

export default function PickupVerificationModal({ order, isBuyer, isSeller, onClose, onVerified }) {
  const { showToast } = useNotification();
  const [inputOtp, setInputOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('otp'); // 'otp', 'qr'

  const handleVerify = async (otpToVerify = inputOtp) => {
    setLoading(true);
    try {
      const data = await safeFetchJson(`/api/orders/${order.id}/verify-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bb_token')}`
        },
        body: JSON.stringify({
          otp: otpToVerify,
          qr_data: order.qr_code_data
        })
      });

      // Trigger Celebration Confetti!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      showToast('🎉 Campus pickup verified successfully! Transaction completed.', 'success', 'Pickup Confirmed');
      onVerified();
      onClose();
    } catch (err) {
      showToast(err.message, 'error', 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--emerald-50)',
            color: 'var(--emerald-600)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.85rem'
          }}
        >
          <ShieldCheck size={32} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Campus Pickup Verification</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '1.25rem' }}>
          Order <strong style={{ color: 'var(--text-dark)' }}>{order.order_number}</strong> — {order.book_title}
        </p>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setActiveTab('otp')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'otp' ? 'white' : 'transparent',
              boxShadow: activeTab === 'otp' ? 'var(--shadow-sm)' : 'none',
              color: activeTab === 'otp' ? 'var(--emerald-700)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}
          >
            <Key size={16} /> 6-Digit OTP Code
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'qr' ? 'white' : 'transparent',
              boxShadow: activeTab === 'qr' ? 'var(--shadow-sm)' : 'none',
              color: activeTab === 'qr' ? 'var(--emerald-700)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}
          >
            <QrCode size={16} /> QR Code Verification
          </button>
        </div>

        {/* OTP TAB */}
        {activeTab === 'otp' && (
          <div>
            {isBuyer ? (
              <div style={{ backgroundColor: 'var(--blue-50)', border: '1px dashed var(--blue-500)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--blue-700)', textTransform: 'uppercase' }}>
                  Your Pickup OTP Code
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '0.25em', color: 'var(--blue-600)', margin: '0.35rem 0' }}>
                  {order.pickup_otp}
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  Show or read this 6-digit OTP code to seller <strong style={{ color: 'var(--text-dark)' }}>{order.seller_name}</strong> at pickup.
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Enter Buyer's Pickup OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  style={{
                    width: '200px',
                    textAlign: 'center',
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.25em',
                    padding: '0.5rem',
                    borderRadius: '12px',
                    border: '2px solid var(--emerald-500)',
                    margin: '0 auto 1rem',
                    display: 'block'
                  }}
                />
                <button
                  onClick={() => handleVerify(inputOtp)}
                  disabled={loading || inputOtp.length < 6}
                  className="btn btn-emerald btn-lg"
                  style={{ width: '100%' }}
                >
                  {loading ? 'Verifying OTP...' : 'Confirm Pickup & Complete Order'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* QR TAB */}
        {activeTab === 'qr' && (
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '14px', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '180px',
                height: '180px',
                margin: '0 auto 1rem',
                backgroundColor: 'white',
                border: '4px solid var(--emerald-500)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <QrCode size={130} color="var(--emerald-700)" />
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {order.qr_code_data}
            </div>

            <button
              onClick={() => handleVerify(order.pickup_otp)}
              className="btn btn-emerald btn-sm"
              style={{ marginTop: '1rem', width: '100%' }}
            >
              Simulate Instant QR Scan Match
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <AlertCircle size={14} color="var(--emerald-600)" /> Pickup protection ensures book condition & payment verification before completion.
        </div>
      </div>
    </div>
  );
}

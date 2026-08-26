import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', title = '') => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, title };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      {/* Global Toast Render */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px', width: '100%' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              backgroundColor: t.type === 'error' ? '#fef2f2' : t.type === 'info' ? '#eff6ff' : '#ecfdf5',
              borderLeft: `4px solid ${t.type === 'error' ? '#ef4444' : t.type === 'info' ? '#3b82f6' : '#10b981'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              animation: 'slideUp 0.2s ease-out'
            }}
          >
            <div>
              {t.title && <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '2px', color: '#0f172a' }}>{t.title}</div>}
              <div style={{ fontSize: '0.85rem', color: '#334155' }}>{t.message}</div>
            </div>
            <button onClick={() => removeToast(t.id)} style={{ color: '#94a3b8', fontSize: '1rem', cursor: 'pointer' }}>×</button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

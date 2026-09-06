import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user, token } = useAuth();
  const { showToast } = useNotification();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const currentUserId = user?.id || user?._id;
  const activeToken = token || localStorage.getItem('bb_token');

  // Fetch initial notifications from DB source of truth
  const fetchNotificationsFromApi = async () => {
    const authToken = activeToken || localStorage.getItem('bb_token');
    if (!authToken) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const safeData = Array.isArray(data) ? data : [];
        setNotifications((prev) => {
          const prevArr = Array.isArray(prev) ? prev : [];
          const map = new Map();
          [...safeData, ...prevArr].forEach((item) => {
            if (!item) return;
            const itemId = (item.id || item._id || '').toString();
            if (itemId && !map.has(itemId)) {
              map.set(itemId, item);
            }
          });
          const merged = Array.from(map.values());
          console.log(`📋 [FRONTEND NOTIFICATION STATE UPDATED] Total notifications: ${merged.length}`);
          return merged;
        });
      }
    } catch (err) {
      console.warn('⚠️ [FRONTEND API ERROR] Failed to fetch notifications from database:', err.message);
    }
  };

  useEffect(() => {
    const authToken = activeToken || localStorage.getItem('bb_token');

    if (isAuthenticated && authToken) {
      console.log(`🔌 [FRONTEND SOCKET ATTEMPTING CONNECT] Authenticated User ID: ${currentUserId || 'Active Student'}`);

      // Explicitly specify socket URL: Use Render backend URL on Vercel, or window.location.origin on localhost
      let socketUrl = window.location.origin;
      if (window.location.hostname.includes('vercel.app')) {
        socketUrl = 'https://bookbridge-api-394s.onrender.com';
      }

      const socket = io(socketUrl, {
        auth: { token: authToken },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        console.log(`✅ [FRONTEND SOCKET CONNECTED] Socket ID: ${socket.id} | Authenticated User ID: ${currentUserId || 'Active Student'}`);
        fetchNotificationsFromApi();
      });

      socket.on('connect_error', (err) => {
        console.warn(`⚡ [FRONTEND SOCKET CONNECT ERROR] ${err.message}`);
      });

      socket.on('disconnect', (reason) => {
        setIsConnected(false);
        console.log(`🔌 [FRONTEND SOCKET DISCONNECTED] Reason: ${reason}`);
      });

      // Listen for targeted real-time notifications
      socket.on('notification:new', (newNotif) => {
        console.log('📡 [FRONTEND NOTIFICATION RECEIVED LIVE]', {
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type
        });

        setNotifications((prev) => {
          const newId = (newNotif.id || newNotif._id || '').toString();
          if (prev.some((n) => (n.id || n._id || '').toString() === newId)) {
            console.log('ℹ️ [FRONTEND NOTIFICATION DEDUPLICATED] Skipping duplicate ID:', newId);
            return prev;
          }
          const updated = [newNotif, ...prev];
          console.log(`✨ [FRONTEND NOTIFICATION STATE UPDATED LIVE] New Unread Count: ${updated.filter((n) => !n.is_read).length}`);
          return updated;
        });

        // Show live toast banner immediately
        showToast(
          newNotif.message || 'You have a new update!',
          'info',
          newNotif.title || '🔔 Real-Time Update'
        );
      });

      // Listen for exchange state updates
      socket.on('exchange:updated', (data) => {
        console.log('📡 [FRONTEND REAL-TIME EVENT] exchange:updated', data);
        window.dispatchEvent(new CustomEvent('bb:exchange_updated', { detail: data }));
        fetchNotificationsFromApi();
      });

      // Listen for order state updates
      socket.on('order:updated', (data) => {
        console.log('📡 [FRONTEND REAL-TIME EVENT] order:updated', data);
        window.dispatchEvent(new CustomEvent('bb:order_updated', { detail: data }));
        fetchNotificationsFromApi();
      });

      // Listen for message updates
      socket.on('message:received', (data) => {
        console.log('📡 [FRONTEND REAL-TIME EVENT] message:received', data);
        window.dispatchEvent(new CustomEvent('bb:message_received', { detail: data }));
      });

      return () => {
        console.log(`🔌 [FRONTEND SOCKET CLEANUP] Disconnecting user socket for ID: ${currentUserId}`);
        socket.disconnect();
        socketRef.current = null;
      };
    } else {
      if (socketRef.current) {
        console.log('🔌 [FRONTEND SOCKET LOGOUT DISCONNECT] Clearing user socket and notifications state.');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setIsConnected(false);
    }
  }, [isAuthenticated, currentUserId, activeToken]);

  const markAsRead = async (notifId) => {
    try {
      const authToken = activeToken || localStorage.getItem('bb_token');
      await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n._id).toString() === notifId.toString() ? { ...n, is_read: true } : n))
      );
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    try {
      const authToken = activeToken || localStorage.getItem('bb_token');
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {}
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        notifications,
        fetchNotificationsFromApi,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

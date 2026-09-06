import express from 'express';
import Notification from '../models/Notification.js';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Get User Notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currentUserIdStr = req.user.id.toString();

    if (isMongoConnected) {
      const notifications = await Notification.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();

      const formatted = notifications.map((n) => ({
        id: n._id.toString(),
        _id: n._id.toString(),
        user_id: currentUserIdStr,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        relatedBook: n.relatedBook ? n.relatedBook.toString() : null,
        relatedExchange: n.relatedExchange ? n.relatedExchange.toString() : null,
        relatedRequest: n.relatedRequest ? n.relatedRequest.toString() : null,
        is_read: n.isRead,
        created_at: n.createdAt
      }));

      return res.json(formatted);
    } else {
      const store = getStore();
      const allNotifs = store.notifications || [];
      const userNotifs = allNotifs
        .filter((n) => (n.user || n.user_id)?.toString() === currentUserIdStr)
        .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))
        .slice(0, 30);

      const formatted = userNotifs.map((n) => ({
        id: (n.id || n._id).toString(),
        _id: (n.id || n._id).toString(),
        user_id: currentUserIdStr,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        relatedBook: n.relatedBook || n.related_book || null,
        relatedExchange: n.relatedExchange || n.related_exchange || null,
        relatedRequest: n.relatedRequest || n.related_request || null,
        is_read: n.isRead !== undefined ? n.isRead : (n.is_read || false),
        created_at: n.createdAt || n.created_at
      }));

      return res.json(formatted);
    }
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// 2. Mark Single Notification Read
const markSingleReadHandler = async (req, res) => {
  try {
    const notifId = req.params.id;
    const currentUserIdStr = req.user.id.toString();

    if (isMongoConnected) {
      await Notification.findOneAndUpdate({ _id: notifId, user: req.user.id }, { isRead: true });
    } else {
      const store = getStore();
      const notif = (store.notifications || []).find(
        (n) => (n.id || n._id)?.toString() === notifId && (n.user || n.user_id)?.toString() === currentUserIdStr
      );
      if (notif) {
        notif.isRead = true;
        notif.is_read = true;
        saveStore();
      }
    }
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
};

router.put('/:id/read', authenticateToken, markSingleReadHandler);
router.patch('/:id/read', authenticateToken, markSingleReadHandler);

// 3. Mark All Notifications Read
const markAllReadHandler = async (req, res) => {
  try {
    const currentUserIdStr = req.user.id.toString();

    if (isMongoConnected) {
      await Notification.updateMany({ user: req.user.id }, { isRead: true });
    } else {
      const store = getStore();
      (store.notifications || []).forEach((n) => {
        if ((n.user || n.user_id)?.toString() === currentUserIdStr) {
          n.isRead = true;
          n.is_read = true;
        }
      });
      saveStore();
    }
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notifications.' });
  }
};

router.put('/read-all', authenticateToken, markAllReadHandler);
router.patch('/mark-read', authenticateToken, markAllReadHandler);

export default router;

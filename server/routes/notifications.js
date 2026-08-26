import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Get User Notifications from MongoDB
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link,
      is_read: n.isRead,
      created_at: n.createdAt
    }));

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// 2. Mark Notification Read in MongoDB
router.patch('/mark-read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id }, { isRead: true });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

export default router;

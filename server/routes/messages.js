import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Get User Conversations from MongoDB
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({ participants: userId })
      .populate('order')
      .populate('participants', 'email phone')
      .sort({ lastMessageAt: -1 })
      .lean();

    const participantIds = [];
    conversations.forEach((c) => {
      c.participants.forEach((p) => participantIds.push(p._id || p));
    });

    const profiles = await UserProfile.find({ user: { $in: participantIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const formatted = conversations.map((c) => {
      const otherPart = c.participants.find((p) => (p._id || p).toString() !== userId) || {};
      const otherIdStr = otherPart._id ? otherPart._id.toString() : otherPart.toString();
      const p = profileMap.get(otherIdStr) || {};
      const order = c.order || {};

      return {
        id: c._id.toString(),
        order_id: order._id ? order._id.toString() : null,
        order_number: order.orderNumber || '',
        book_title: c.lastMessageText ? 'Textbook Pickup Chat' : 'Campus Trade',
        other_user: {
          id: otherIdStr,
          name: p.fullName || 'Student Partner',
          avatar: p.avatarUrl || ''
        },
        last_message: c.lastMessageText || 'Conversation started.',
        last_timestamp: c.lastMessageAt || c.createdAt
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error('Fetch conversations error:', err);
    return res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// 2. Get Messages in a Conversation from MongoDB
router.get('/:convId', authenticateToken, async (req, res) => {
  try {
    const convId = req.params.convId;

    const messages = await Message.find({ conversation: convId })
      .populate('sender', 'email phone')
      .sort({ createdAt: 1 })
      .lean();

    const senderIds = messages.map((m) => m.sender._id || m.sender);
    const profiles = await UserProfile.find({ user: { $in: senderIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const formatted = messages.map((m) => {
      const senderIdStr = (m.sender._id || m.sender).toString();
      const p = profileMap.get(senderIdStr) || {};
      return {
        id: m._id.toString(),
        conversation_id: m.conversation.toString(),
        sender_id: senderIdStr,
        receiver_id: m.receiver.toString(),
        text: m.text,
        is_read: m.isRead,
        timestamp: m.createdAt,
        sender_name: p.fullName || 'Student',
        sender_avatar: p.avatarUrl || ''
      };
    });

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// 3. Send Message in MongoDB
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { conversation_id, receiver_id, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const newMsg = await Message.create({
      conversation: conversation_id,
      sender: req.user.id,
      receiver: receiver_id,
      text: text.trim(),
      isRead: false
    });

    await Conversation.findByIdAndUpdate(conversation_id, {
      lastMessageText: text.trim(),
      lastMessageAt: new Date()
    });

    const senderProfile = await UserProfile.findOne({ user: req.user.id }).lean();

    return res.status(201).json({
      id: newMsg._id.toString(),
      conversation_id: conversation_id,
      sender_id: req.user.id,
      receiver_id,
      text: text.trim(),
      is_read: false,
      timestamp: newMsg.createdAt,
      sender_name: senderProfile ? senderProfile.fullName : 'Student',
      sender_avatar: senderProfile ? senderProfile.avatarUrl : ''
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

export default router;

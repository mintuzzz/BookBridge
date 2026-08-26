import express from 'express';
import Report from '../models/Report.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Submit Report for Listing or User in MongoDB
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { target_type, target_id, reason, description } = req.body;

    if (!target_type || !target_id || !reason) {
      return res.status(400).json({ error: 'Please specify report target and reason.' });
    }

    await Report.create({
      reporter: req.user.id,
      targetType: target_type,
      targetId: target_id.toString(),
      reason,
      description: description || '',
      status: 'pending'
    });

    return res.status(201).json({
      message: 'Report submitted to platform moderation team in MongoDB. Thank you for keeping BookBridge safe!'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
});

export default router;

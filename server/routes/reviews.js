import express from 'express';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import UserProfile from '../models/UserProfile.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Submit Rating & Review after Completed Transaction in MongoDB
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { order_id, rating, comment } = req.body;

    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ error: 'Order record not found.' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'Reviews can only be submitted for completed transactions.' });
    }

    const revieweeId = order.buyer.toString() === req.user.id ? order.seller : order.buyer;

    // Prevent duplicate reviews in MongoDB
    const existing = await Review.findOne({ order: order_id, reviewer: req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted a review for this order.' });
    }

    await Review.create({
      order: order_id,
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating: parseInt(rating, 10),
      comment: comment || ''
    });

    // Recalculate Seller Average Star Rating in UserProfile
    const reviews = await Review.find({ reviewee: revieweeId });
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await UserProfile.findOneAndUpdate({ user: revieweeId }, { rating: parseFloat(avg.toFixed(1)) });
    }

    return res.status(201).json({ message: 'Thank you for your rating & review!' });
  } catch (err) {
    console.error('Review submit error:', err);
    return res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// 2. Get User Reviews from MongoDB
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const reviews = await Review.find({ reviewee: userId })
      .populate('reviewer', 'email phone')
      .sort({ createdAt: -1 })
      .lean();

    const reviewerIds = reviews.map((r) => r.reviewer._id || r.reviewer);
    const profiles = await UserProfile.find({ user: { $in: reviewerIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const formatted = reviews.map((r) => {
      const reviewerIdStr = (r.reviewer._id || r.reviewer).toString();
      const p = profileMap.get(reviewerIdStr) || {};
      return {
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment,
        created_at: r.createdAt,
        reviewer_name: p.fullName || 'Student',
        reviewer_avatar: p.avatarUrl || ''
      };
    });

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

export default router;

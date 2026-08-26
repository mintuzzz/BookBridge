import express from 'express';
import Donation from '../models/Donation.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Get Free Books Feed from MongoDB
router.get('/', async (req, res) => {
  try {
    const books = await Book.find({
      transactionType: 'donate',
      status: 'available'
    })
      .populate('seller', 'email phone')
      .sort({ createdAt: -1 })
      .lean();

    const sellerIds = books.map((b) => b.seller?._id || b.seller);
    const profiles = await UserProfile.find({ user: { $in: sellerIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const formatted = books.map((b) => {
      const sellerIdStr = (b.seller?._id || b.seller).toString();
      const p = profileMap.get(sellerIdStr) || {};
      return {
        id: b._id.toString(),
        seller_id: sellerIdStr,
        donor_name: p.fullName || 'Generous Senior',
        donor_rating: p.rating || 4.8,
        donor_avatar: p.avatarUrl || '',
        donor_institution: p.institution || 'State University',
        title: b.title,
        author: b.author,
        edition: b.edition,
        isbn: b.isbn,
        subject: b.subject,
        department: b.department,
        semester: b.semester,
        condition: b.condition,
        original_price: b.originalPrice,
        selling_price: 0,
        transaction_type: 'donate',
        status: b.status,
        location: b.location,
        description: b.description,
        images: b.images || [],
        created_at: b.createdAt
      };
    });

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch free books.' });
  }
});

// 2. Request a Free Donation in MongoDB
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { book_id, reason_needed } = req.body;

    const book = await Book.findOne({ _id: book_id, transactionType: 'donate' });
    if (!book) {
      return res.status(404).json({ error: 'Donation listing not found.' });
    }

    if (book.seller.toString() === req.user.id) {
      return res.status(400).json({ error: 'You cannot request your own donation listing.' });
    }

    const newDonation = await Donation.create({
      donor: book.seller,
      book: book._id,
      recipient: req.user.id,
      reasonNeeded: reason_needed || 'Needed for current semester coursework.',
      status: 'requested'
    });

    await Notification.create({
      user: book.seller,
      title: '🎁 New Donation Request!',
      message: `${req.user.full_name || 'A student'} requested your free book "${book.title}".`,
      type: 'request',
      link: '/donations'
    });

    return res.status(201).json({
      message: 'Donation request submitted to donor!',
      donation_id: newDonation._id.toString()
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to request donation.' });
  }
});

export default router;

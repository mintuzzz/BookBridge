import express from 'express';
import Wishlist from '../models/Wishlist.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Get User Wishlist from MongoDB
router.get('/', authenticateToken, async (req, res) => {
  try {
    const wishlists = await Wishlist.find({ user: req.user.id })
      .populate('book')
      .sort({ createdAt: -1 })
      .lean();

    const validItems = wishlists.filter((w) => w.book);
    const sellerIds = validItems.map((w) => w.book.seller);
    const profiles = await UserProfile.find({ user: { $in: sellerIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const formatted = validItems.map((w) => {
      const b = w.book;
      const sellerIdStr = b.seller ? b.seller.toString() : '';
      const p = profileMap.get(sellerIdStr) || {};
      return {
        wishlist_id: w._id.toString(),
        saved_at: w.createdAt,
        id: b._id.toString(),
        seller_id: sellerIdStr,
        seller_name: p.fullName || 'Verified Student',
        seller_rating: p.rating || 4.8,
        seller_avatar: p.avatarUrl || '',
        title: b.title,
        author: b.author,
        edition: b.edition,
        isbn: b.isbn,
        subject: b.subject,
        department: b.department,
        semester: b.semester,
        condition: b.condition,
        original_price: b.originalPrice,
        selling_price: b.sellingPrice,
        transaction_type: b.transactionType,
        status: b.status,
        location: b.location,
        description: b.description,
        images: b.images || []
      };
    });

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch wishlist.' });
  }
});

// 2. Toggle Wishlist Item in MongoDB
router.post('/toggle', authenticateToken, async (req, res) => {
  try {
    const { book_id } = req.body;

    const existing = await Wishlist.findOne({ user: req.user.id, book: book_id });

    if (existing) {
      await Wishlist.findByIdAndDelete(existing._id);
      return res.json({ message: 'Removed from wishlist', saved: false });
    } else {
      await Wishlist.create({ user: req.user.id, book: book_id });
      return res.json({ message: 'Saved to wishlist!', saved: true });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle wishlist.' });
  }
});

export default router;

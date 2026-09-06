import express from 'express';
import Wishlist from '../models/Wishlist.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Get User Wishlist
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currentUserIdStr = req.user.id.toString();

    if (isMongoConnected) {
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
          seller_rating: p.rating || 0,
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
    } else {
      const store = getStore();
      const userWishlists = (store.wishlists || []).filter((w) => (w.user || w.user_id)?.toString() === currentUserIdStr);
      const profiles = store.userprofiles || [];
      const profileMap = new Map(profiles.map((p) => [p.user?.toString(), p]));

      const formatted = [];
      for (const w of userWishlists) {
        const bookIdStr = (w.book || w.book_id)?.toString();
        const b = (store.books || []).find((bk) => (bk.id || bk._id)?.toString() === bookIdStr);
        if (b) {
          const sellerIdStr = (b.seller?._id || b.seller || '').toString();
          const p = profileMap.get(sellerIdStr) || {};
          formatted.push({
            wishlist_id: (w.id || w._id).toString(),
            saved_at: w.createdAt || w.created_at,
            id: (b.id || b._id).toString(),
            seller_id: sellerIdStr,
            seller_name: p.fullName || 'Verified Student',
            seller_rating: p.rating || 0,
            seller_avatar: p.avatarUrl || '',
            title: b.title,
            author: b.author,
            edition: b.edition,
            isbn: b.isbn,
            subject: b.subject,
            department: b.department,
            semester: b.semester,
            condition: b.condition,
            original_price: b.originalPrice || b.original_price || 0,
            selling_price: b.sellingPrice || b.selling_price || 0,
            transaction_type: b.transactionType || b.transaction_type || 'buy',
            status: b.status,
            location: b.location,
            description: b.description || '',
            images: b.images || []
          });
        }
      }

      return res.json(formatted);
    }
  } catch (err) {
    console.error('Fetch wishlist error:', err);
    return res.status(500).json({ error: 'Failed to fetch wishlist.' });
  }
});

// 2. Toggle Wishlist Item
router.post('/toggle', authenticateToken, async (req, res) => {
  try {
    const { book_id } = req.body;
    const currentUserIdStr = req.user.id.toString();

    if (isMongoConnected) {
      const existing = await Wishlist.findOne({ user: req.user.id, book: book_id });

      if (existing) {
        await Wishlist.findByIdAndDelete(existing._id);
        return res.json({ message: 'Removed from wishlist', saved: false });
      } else {
        await Wishlist.create({ user: req.user.id, book: book_id });
        return res.json({ message: 'Saved to wishlist!', saved: true });
      }
    } else {
      const store = getStore();
      if (!store.wishlists) store.wishlists = [];

      const existingIndex = store.wishlists.findIndex(
        (w) => (w.user || w.user_id)?.toString() === currentUserIdStr && (w.book || w.book_id)?.toString() === book_id.toString()
      );

      if (existingIndex !== -1) {
        store.wishlists.splice(existingIndex, 1);
        saveStore();
        return res.json({ message: 'Removed from wishlist', saved: false });
      } else {
        const wId = `w_${Date.now()}`;
        store.wishlists.unshift({
          id: wId,
          _id: wId,
          user: currentUserIdStr,
          user_id: currentUserIdStr,
          book: book_id.toString(),
          book_id: book_id.toString(),
          createdAt: new Date().toISOString()
        });
        saveStore();
        return res.json({ message: 'Saved to wishlist!', saved: true });
      }
    }
  } catch (err) {
    console.error('Toggle wishlist error:', err);
    return res.status(500).json({ error: 'Failed to toggle wishlist.' });
  }
});

export default router;

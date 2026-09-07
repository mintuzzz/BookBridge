import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Book from '../models/Book.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import EcoPoint from '../models/EcoPoint.js';
import Notification from '../models/Notification.js';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { triggerNotificationsForNewBook } from '../utils/notificationsHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper to remove local file from uploads directory
const cleanupLocalImages = (imagesArray) => {
  if (!Array.isArray(imagesArray)) return;
  imagesArray.forEach((imgUrl) => {
    if (typeof imgUrl === 'string' && imgUrl.startsWith('/uploads/books/')) {
      const filePath = path.join(__dirname, '..', '..', imgUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up deleted book image file: ${filePath}`);
        } catch (e) {
          console.warn('Failed to delete image file:', e.message);
        }
      }
    }
  });
};

// Helper to format book objects consistently
const formatBookDoc = (b, profile = {}, user = {}) => {
  const p = profile || {};
  const u = user || {};
  const origPrice = b.originalPrice !== undefined ? b.originalPrice : (b.original_price !== undefined ? b.original_price : 0);
  const sellPrice = b.sellingPrice !== undefined ? b.sellingPrice : (b.selling_price !== undefined ? b.selling_price : 0);
  const transType = b.transactionType || b.transaction_type || 'buy';
  const sellerIdStr = b.seller?._id ? b.seller._id.toString() : (b.seller ? b.seller.toString() : '');

  return {
    id: (b._id || b.id).toString(),
    _id: (b._id || b.id).toString(),
    seller_id: sellerIdStr,
    seller_name: p.fullName || 'Verified Student',
    seller_phone: p.phone || u.phone || b.seller?.phone || '',
    seller_email: u.email || b.seller?.email || '',
    seller_rating: p.rating || 0,
    seller_avatar: p.avatarUrl || '',
    seller_institution: p.institution || 'State University',
    seller_dept: p.department || 'Computer Science',
    title: b.title,
    author: b.author,
    edition: b.edition || 'Standard Edition',
    isbn: b.isbn || '',
    subject: b.subject,
    department: b.department,
    semester: b.semester,
    condition: b.condition,
    original_price: origPrice,
    originalPrice: origPrice,
    selling_price: sellPrice,
    sellingPrice: sellPrice,
    transaction_type: transType,
    transactionType: transType,
    status: b.status || 'available',
    location: b.location,
    description: b.description || '',
    images: Array.isArray(b.images) ? b.images : [],
    wanted_book_title: b.wantedBookTitle || b.wanted_book_title || null,
    wantedBookTitle: b.wantedBookTitle || b.wanted_book_title || null,
    view_count: b.viewCount || b.view_count || 0,
    viewCount: b.viewCount || b.view_count || 0,
    created_at: b.createdAt || b.created_at || new Date().toISOString()
  };
};

// Public Platform Statistics Endpoint
router.get('/stats', async (req, res) => {
  try {
    if (isMongoConnected) {
      const soldBooks = await Book.countDocuments({ status: 'sold' });
      const exchangeCount = await Book.countDocuments({ status: 'exchanged' });
      const donateCount = await Book.countDocuments({ transactionType: 'donate' });
      const allBooks = await Book.find({}).lean();

      const moneySaved = allBooks.reduce((sum, b) => {
        const orig = b.originalPrice || 0;
        const sell = b.sellingPrice || 0;
        return sum + (orig > sell ? orig - sell : 0);
      }, 0);

      return res.json({
        booksReused: soldBooks,
        moneySaved,
        peerExchanges: exchangeCount,
        freeDonations: donateCount
      });
    } else {
      const store = getStore();
      const books = store.books || [];
      const exchanges = store.exchanges || [];

      const soldBooks = books.filter((b) => b.status === 'sold').length;
      const exchangeCount = exchanges.filter((e) => e.status === 'completed').length;
      const donateCount = books.filter((b) => (b.transactionType || b.transaction_type) === 'donate').length;

      const moneySaved = books.reduce((sum, b) => {
        const orig = b.originalPrice !== undefined ? b.originalPrice : (b.original_price || 0);
        const sell = b.sellingPrice !== undefined ? b.sellingPrice : (b.selling_price || 0);
        return sum + (orig > sell ? orig - sell : 0);
      }, 0);

      return res.json({
        booksReused: soldBooks,
        moneySaved,
        peerExchanges: exchangeCount,
        freeDonations: donateCount
      });
    }
  } catch (err) {
    return res.json({ booksReused: 0, moneySaved: 0, peerExchanges: 0, freeDonations: 0 });
  }
});

// 1. Get All Books with Filtering
router.get('/', async (req, res) => {
  try {
    const { department, semester, transaction_type, search, status = 'available', max_price, sort } = req.query;

    if (isMongoConnected) {
      const query = {};
      if (status !== 'all') query.status = status;
      if (department && department !== 'All') query.department = department;
      if (semester && semester !== 'All') query.semester = parseInt(semester, 10);
      if (transaction_type && transaction_type !== 'All') query.transactionType = transaction_type;

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } }
        ];
      }

      let sortOption = { createdAt: -1 };
      if (sort === 'price_asc') sortOption = { sellingPrice: 1 };
      if (sort === 'price_desc') sortOption = { sellingPrice: -1 };
      if (sort === 'popular') sortOption = { viewCount: -1 };

      const books = await Book.find(query)
        .populate('seller', 'email phone role')
        .sort(sortOption)
        .lean();

      const sellerIds = books.map((b) => b.seller?._id || b.seller);
      const profiles = await UserProfile.find({ user: { $in: sellerIds } }).lean();
      const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

      const formattedBooks = books.map((b) => {
        const sellerIdStr = (b.seller?._id || b.seller).toString();
        const p = profileMap.get(sellerIdStr) || {};
        return formatBookDoc(b, p, b.seller || {});
      });

      return res.json(formattedBooks);
    } else {
      const store = getStore();
      let books = store.books || [];
      if (status !== 'all') books = books.filter((b) => b.status === status);
      if (department && department !== 'All') books = books.filter((b) => b.department === department);
      if (semester && semester !== 'All') books = books.filter((b) => b.semester === parseInt(semester, 10));
      if (transaction_type && transaction_type !== 'All') books = books.filter((b) => (b.transactionType || b.transaction_type) === transaction_type);
      
      if (max_price) {
        const maxP = parseFloat(max_price);
        books = books.filter((b) => {
          const sp = b.sellingPrice !== undefined ? b.sellingPrice : b.selling_price;
          return sp <= maxP;
        });
      }

      if (search) {
        const s = search.toLowerCase();
        books = books.filter((b) =>
          (b.title && b.title.toLowerCase().includes(s)) ||
          (b.author && b.author.toLowerCase().includes(s)) ||
          (b.subject && b.subject.toLowerCase().includes(s))
        );
      }

      if (sort === 'price_asc') {
        books = [...books].sort((a, b) => (a.sellingPrice ?? a.selling_price ?? 0) - (b.sellingPrice ?? b.selling_price ?? 0));
      } else if (sort === 'price_desc') {
        books = [...books].sort((a, b) => (b.sellingPrice ?? b.selling_price ?? 0) - (a.sellingPrice ?? a.selling_price ?? 0));
      } else if (sort === 'popular') {
        books = [...books].sort((a, b) => (b.viewCount ?? b.view_count ?? 0) - (a.viewCount ?? a.view_count ?? 0));
      } else {
        books = [...books].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
      }

      const formatted = books.map((b) => {
        const sellerId = (b.seller?._id || b.seller || '').toString();
        const profile = (store.userprofiles || []).find((p) => p.user?.toString() === sellerId) || {};
        const user = (store.users || []).find((u) => (u._id || u.id)?.toString() === sellerId) || {};
        return formatBookDoc(b, profile, user);
      });

      return res.json(formatted);
    }
  } catch (err) {
    console.error('Fetch books error:', err);
    return res.status(500).json({ error: 'Failed to fetch book listings.' });
  }
});

// 2. Get Single Book Details
router.get('/:id', async (req, res) => {
  try {
    const bookId = req.params.id;

    if (isMongoConnected) {
      let book = null;
      if (mongoose.Types.ObjectId.isValid(bookId)) {
        book = await Book.findByIdAndUpdate(
          bookId,
          { $inc: { viewCount: 1 } },
          { new: true }
        )
          .populate('seller', 'email phone role')
          .lean();
      }

      if (!book) {
        book = await Book.findOneAndUpdate(
          { id: bookId },
          { $inc: { viewCount: 1 } },
          { new: true }
        )
          .populate('seller', 'email phone role')
          .lean();
      }

      if (!book) return res.status(404).json({ error: 'Book listing not found.' });

      const sellerId = (book.seller?._id || book.seller || '').toString();
      let userObj = (typeof book.seller === 'object' && book.seller !== null && book.seller.email) ? book.seller : {};
      if (!userObj.email && sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
        userObj = (await User.findById(sellerId).select('email phone role').lean()) || {};
      }

      const profile = (sellerId && mongoose.Types.ObjectId.isValid(sellerId))
        ? await UserProfile.findOne({ user: sellerId }).lean()
        : null;

      return res.json(formatBookDoc(book, profile || {}, userObj));
    } else {
      const store = getStore();
      const book = store.books.find((b) => (b._id || b.id).toString() === bookId);
      if (!book) return res.status(404).json({ error: 'Book listing not found.' });
      book.viewCount = (book.viewCount || 0) + 1;
      saveStore();
      const sellerId = (book.seller?._id || book.seller || '').toString();
      const profile = (store.userprofiles || []).find((p) => p.user?.toString() === sellerId) || {};
      const user = (store.users || []).find((u) => (u._id || u.id)?.toString() === sellerId) || {};
      return res.json(formatBookDoc(book, profile, user));
    }
  } catch (err) {
    console.error('Fetch single book error:', err);
    return res.status(500).json({ error: 'Failed to fetch book details.' });
  }
});

// 3. Create Book Listing (Exchange / Sell / Gift)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      author,
      edition,
      isbn,
      subject,
      department,
      semester,
      condition,
      original_price,
      selling_price,
      transaction_type,
      location,
      description,
      images,
      wanted_book_title
    } = req.body;

    if (!title || !author || !subject || !department || !semester || !condition || !transaction_type || !location) {
      return res.status(400).json({ error: 'Missing required book details.' });
    }

    const finalImages = Array.isArray(images) && images.length > 0 ? images.slice(0, 3) : [];

    const createBook = async (data) => {
      if (isMongoConnected) {
        return await Book.create(data);
      } else {
        const store = getStore();
        const newDoc = {
          _id: `b_${Date.now()}`,
          ...data,
          createdAt: new Date().toISOString()
        };
        store.books.push(newDoc);
        saveStore();
        return newDoc;
      }
    };

    const newBook = await createBook({
      seller: req.user.id,
      title,
      author,
      edition: edition || 'Standard Edition',
      isbn: isbn || '',
      subject,
      department,
      semester: parseInt(semester, 10),
      condition,
      originalPrice: parseFloat(original_price) || 0,
      sellingPrice: transaction_type === 'donate' ? 0 : parseFloat(selling_price) || 0,
      transactionType: transaction_type,
      location,
      description: description || '',
      images: finalImages,
      wantedBookTitle: wanted_book_title || null,
      status: 'available'
    });

    // Reward Student with +20 Eco Points
    if (isMongoConnected) {
      try {
        await EcoPoint.create({
          user: req.user.id,
          points: 20,
          action: transaction_type === 'donate' ? 'donate' : (transaction_type === 'exchange' ? 'exchange' : 'reuse'),
          description: `Earned +20 Eco Points for listing "${title}"`
        });
        await UserProfile.findOneAndUpdate(
          { user: req.user.id },
          { $inc: { ecoPoints: 20 } }
        );
        await Notification.create({
          user: req.user.id,
          title: '🌱 Eco Points Awarded!',
          message: `You earned 20 Eco Points for listing "${title}" on BookBridge!`,
          type: 'eco'
        });
      } catch (ecoErr) {
        console.warn('EcoPoints reward notification warning:', ecoErr.message);
      }
    }

    const plainBook = newBook.toObject ? newBook.toObject() : newBook;

    // Trigger Notifications for Book Requests, Wishlists, Donations, and Exchange Matches
    try {
      await triggerNotificationsForNewBook(plainBook, req.user);
    } catch (notifErr) {
      console.warn('⚠️ Trigger notifications warning:', notifErr.message);
    }

    const formattedBook = {
      id: (plainBook._id || plainBook.id).toString(),
      seller_id: (plainBook.seller?._id || plainBook.seller).toString(),
      title: plainBook.title,
      author: plainBook.author,
      edition: plainBook.edition,
      isbn: plainBook.isbn,
      subject: plainBook.subject,
      department: plainBook.department,
      semester: plainBook.semester,
      condition: plainBook.condition,
      original_price: plainBook.originalPrice,
      selling_price: plainBook.sellingPrice,
      transaction_type: plainBook.transactionType,
      status: plainBook.status,
      location: plainBook.location,
      description: plainBook.description,
      images: plainBook.images || [],
      wanted_book_title: plainBook.wantedBookTitle,
      view_count: plainBook.viewCount || 0,
      created_at: plainBook.createdAt
    };

    return res.status(201).json({
      message: 'Book listed successfully in MongoDB!',
      book: formattedBook
    });
  } catch (err) {
    console.error('Create book error:', err);
    return res.status(500).json({ error: 'Failed to create book listing.' });
  }
});

// 4. Update Book Listing (Owner or Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;

    if (isMongoConnected) {
      const book = await Book.findById(bookId);
      if (!book) return res.status(404).json({ error: 'Listing not found.' });

      // SECURITY CHECK: Seller or Admin can edit
      if (book.seller.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized to update this listing.' });
      }

      const {
        title,
        author,
        edition,
        isbn,
        subject,
        department,
        semester,
        condition,
        original_price,
        selling_price,
        transaction_type,
        location,
        description,
        status,
        images,
        wanted_book_title
      } = req.body;

      if (title) book.title = title;
      if (author) book.author = author;
      if (edition) book.edition = edition;
      if (isbn !== undefined) book.isbn = isbn;
      if (subject) book.subject = subject;
      if (department) book.department = department;
      if (semester) book.semester = parseInt(semester, 10);
      if (condition) book.condition = condition;
      if (original_price !== undefined) book.originalPrice = parseFloat(original_price);
      if (selling_price !== undefined) book.sellingPrice = parseFloat(selling_price);
      if (transaction_type) book.transactionType = transaction_type;
      if (location) book.location = location;
      if (description !== undefined) book.description = description;
      if (status) book.status = status;
      if (wanted_book_title !== undefined) book.wantedBookTitle = wanted_book_title;

      if (Array.isArray(images)) {
        // Clean up removed local files from disk if necessary
        const oldImages = book.images || [];
        const removedImages = oldImages.filter((img) => !images.includes(img));
        cleanupLocalImages(removedImages);

        book.images = images.slice(0, 3);
      }

      await book.save();
      return res.json({ message: 'Listing updated successfully', book });
    } else {
      const store = getStore();
      const book = store.books.find((b) => (b._id || b.id).toString() === bookId);
      if (!book) return res.status(404).json({ error: 'Listing not found.' });

      const { title, author, status, images } = req.body;
      if (title) book.title = title;
      if (author) book.author = author;
      if (status) book.status = status;
      if (Array.isArray(images)) book.images = images.slice(0, 3);

      saveStore();
      return res.json({ message: 'Listing updated successfully', book });
    }
  } catch (err) {
    console.error('Update book error:', err);
    return res.status(500).json({ error: 'Failed to update book listing.' });
  }
});

// 5. Delete Book Listing (Owner or Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;

    if (isMongoConnected) {
      const book = await Book.findById(bookId);
      if (!book) return res.status(404).json({ error: 'Listing not found.' });

      // SECURITY CHECK: Seller or Admin can delete
      if (book.seller.toString() !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized to delete this listing.' });
      }

      // Clean up uploaded local images from disk
      cleanupLocalImages(book.images);

      await Book.deleteOne({ _id: bookId });
    } else {
      const store = getStore();
      const book = store.books.find((b) => (b._id || b.id).toString() === bookId);
      if (book) cleanupLocalImages(book.images);
      store.books = store.books.filter((b) => (b._id || b.id).toString() !== bookId);
      saveStore();
    }

    return res.json({ message: 'Listing and associated images deleted successfully.' });
  } catch (err) {
    console.error('Delete book error:', err);
    return res.status(500).json({ error: 'Failed to delete listing.' });
  }
});

export default router;

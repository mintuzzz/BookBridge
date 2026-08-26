import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import EcoPoint from '../models/EcoPoint.js';
import Notification from '../models/Notification.js';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

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

// 1. Get All Books with Filtering
router.get('/', async (req, res) => {
  try {
    const { department, semester, transaction_type, search, status = 'available' } = req.query;

    if (isMongoConnected) {
      const query = {};
      if (status !== 'all') query.status = status;
      if (department) query.department = department;
      if (semester) query.semester = parseInt(semester, 10);
      if (transaction_type) query.transactionType = transaction_type;

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } }
        ];
      }

      const books = await Book.find(query)
        .populate('seller', 'email phone role')
        .sort({ createdAt: -1 })
        .lean();

      const sellerIds = books.map((b) => b.seller?._id || b.seller);
      const profiles = await UserProfile.find({ user: { $in: sellerIds } }).lean();
      const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

      const formattedBooks = books.map((b) => {
        const sellerIdStr = (b.seller?._id || b.seller).toString();
        const p = profileMap.get(sellerIdStr) || {};
        return {
          id: b._id.toString(),
          seller_id: sellerIdStr,
          seller_name: p.fullName || 'Verified Student',
          seller_rating: p.rating || 4.8,
          seller_avatar: p.avatarUrl || '',
          seller_institution: p.institution || 'State University',
          seller_dept: p.department || 'Computer Science',
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
          images: b.images && b.images.length > 0 ? b.images : [
            'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
          ],
          wanted_book_title: b.wantedBookTitle,
          view_count: b.viewCount || 0,
          created_at: b.createdAt
        };
      });

      return res.json(formattedBooks);
    } else {
      const store = getStore();
      let books = store.books || [];
      if (status !== 'all') books = books.filter((b) => b.status === status);
      if (department) books = books.filter((b) => b.department === department);

      return res.json(books.map((b) => ({ ...b, id: b._id || b.id })));
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
      const book = await Book.findByIdAndUpdate(
        bookId,
        { $inc: { viewCount: 1 } },
        { new: true }
      )
        .populate('seller', 'email phone role')
        .lean();

      if (!book) return res.status(404).json({ error: 'Book listing not found.' });

      const profile = await UserProfile.findOne({ user: book.seller._id }).lean();

      const formattedBook = {
        id: book._id.toString(),
        seller_id: book.seller._id.toString(),
        seller_name: profile?.fullName || 'Verified Student',
        seller_phone: profile?.phone || book.seller.phone || '',
        seller_email: book.seller.email,
        seller_rating: profile?.rating || 4.8,
        seller_avatar: profile?.avatarUrl || '',
        seller_institution: profile?.institution || 'State University',
        seller_dept: profile?.department || 'Computer Science',
        title: book.title,
        author: book.author,
        edition: book.edition,
        isbn: book.isbn,
        subject: book.subject,
        department: book.department,
        semester: book.semester,
        condition: book.condition,
        original_price: book.originalPrice,
        selling_price: book.sellingPrice,
        transaction_type: book.transactionType,
        status: book.status,
        location: book.location,
        description: book.description,
        images: book.images && book.images.length > 0 ? book.images : [
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
        ],
        wanted_book_title: book.wantedBookTitle,
        view_count: book.viewCount || 0,
        created_at: book.createdAt
      };

      return res.json(formattedBook);
    } else {
      const store = getStore();
      const book = store.books.find((b) => (b._id || b.id).toString() === bookId);
      if (!book) return res.status(404).json({ error: 'Book listing not found.' });
      return res.json({ ...book, id: book._id || book.id });
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

    const defaultImages = [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
    ];

    const finalImages = Array.isArray(images) && images.length > 0 ? images.slice(0, 3) : defaultImages;

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

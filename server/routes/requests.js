import express from 'express';
import BookRequest from '../models/BookRequest.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import Notification from '../models/Notification.js';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { createNotification } from '../utils/notificationsHelper.js';
import { titlesMatch } from '../utils/titleNormalizer.js';

const router = express.Router();

// 1. Get All Active Book Requests
router.get('/', async (req, res) => {
  try {
    if (isMongoConnected) {
      const requests = await BookRequest.find({ status: 'active' })
        .populate('requester', 'email phone')
        .sort({ createdAt: -1 })
        .lean();

      const requesterIds = requests.map((r) => r.requester?._id || r.requester);
      const profiles = await UserProfile.find({ user: { $in: requesterIds } }).lean();
      const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

      const formatted = requests.map((r) => {
        const uidStr = (r.requester?._id || r.requester).toString();
        const p = profileMap.get(uidStr) || {};
        return {
          id: r._id.toString(),
          requester_id: uidStr,
          requester_name: p.fullName || 'Student',
          requester_rating: p.rating || 0,
          requester_avatar: p.avatarUrl || '',
          requester_dept: p.department || r.department,
          requester_institution: p.institution || 'State University',
          title: r.title,
          author: r.author,
          isbn: r.isbn,
          subject: r.subject,
          department: r.department,
          semester: r.semester,
          preferred_price: r.preferredPrice,
          condition_pref: r.conditionPref,
          description: r.description,
          status: r.status,
          created_at: r.createdAt
        };
      });

      return res.json(formatted);
    } else {
      const store = getStore();
      const requests = (store.bookrequests || []).filter((r) => r.status === 'active');
      const profiles = store.userprofiles || [];
      const profileMap = new Map(profiles.map((p) => [p.user?.toString(), p]));

      const formatted = requests.map((r) => {
        const uidStr = (r.requester || r.requester_id || '').toString();
        const p = profileMap.get(uidStr) || {};
        return {
          id: (r.id || r._id).toString(),
          requester_id: uidStr,
          requester_name: p.fullName || 'Student',
          requester_rating: p.rating || 0,
          requester_avatar: p.avatarUrl || '',
          requester_dept: p.department || r.department,
          requester_institution: p.institution || 'State University',
          title: r.title,
          author: r.author,
          isbn: r.isbn,
          subject: r.subject,
          department: r.department,
          semester: r.semester,
          preferred_price: r.preferredPrice || r.preferred_price || 0,
          condition_pref: r.conditionPref || r.condition_pref || 'Any Condition',
          description: r.description || '',
          status: r.status,
          created_at: r.createdAt || r.created_at
        };
      });

      return res.json(formatted);
    }
  } catch (err) {
    console.error('Fetch requests error:', err);
    return res.status(500).json({ error: 'Failed to fetch book requests.' });
  }
});

// 2. Create a Book Request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, author, isbn, subject, department, semester, preferred_price, condition_pref, description } = req.body;
    const currentUserIdStr = req.user.id.toString();

    if (!title || !subject || !department || !semester) {
      return res.status(400).json({ error: 'Please provide Title, Subject, Department, and Semester.' });
    }

    let reqId = '';
    if (isMongoConnected) {
      const newReq = await BookRequest.create({
        requester: req.user.id,
        title,
        author: author || '',
        isbn: isbn || '',
        subject,
        department,
        semester: parseInt(semester, 10),
        preferredPrice: parseFloat(preferred_price) || 0,
        conditionPref: condition_pref || 'Any Condition',
        description: description || '',
        status: 'active'
      });
      reqId = newReq._id.toString();
    } else {
      const store = getStore();
      if (!store.bookrequests) store.bookrequests = [];
      reqId = `req_${Date.now()}`;
      const newReqDoc = {
        id: reqId,
        _id: reqId,
        requester: currentUserIdStr,
        requester_id: currentUserIdStr,
        title,
        author: author || '',
        isbn: isbn || '',
        subject,
        department,
        semester: parseInt(semester, 10),
        preferredPrice: parseFloat(preferred_price) || 0,
        conditionPref: condition_pref || 'Any Condition',
        description: description || '',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      store.bookrequests.unshift(newReqDoc);
      saveStore();
    }

    // Check if a matching available book already exists
    if (isMongoConnected) {
      const books = await Book.find({ status: 'available' }).lean();
      const matchingBook = books.find((b) => titlesMatch(title, b.title) || titlesMatch(subject, b.subject));
      if (matchingBook) {
        await createNotification({
          user: currentUserIdStr,
          type: 'request',
          title: '💡 Matching Book Available!',
          message: `A book matching your request "${title}" is already available for ₹${matchingBook.sellingPrice || 0}!`,
          link: `/books/${matchingBook._id}`,
          relatedBook: matchingBook._id.toString()
        });
      }
    } else {
      const store = getStore();
      const books = (store.books || []).filter((b) => b.status === 'available');
      const matchingBook = books.find((b) => titlesMatch(title, b.title) || titlesMatch(subject, b.subject));
      if (matchingBook) {
        await createNotification({
          user: currentUserIdStr,
          type: 'request',
          title: '💡 Matching Book Available!',
          message: `A book matching your request "${title}" is already available for ₹${matchingBook.sellingPrice || matchingBook.selling_price || 0}!`,
          link: `/books/${matchingBook.id || matchingBook._id}`,
          relatedBook: (matchingBook.id || matchingBook._id).toString()
        });
      }
    }

    return res.status(201).json({
      message: 'Book request posted to campus board!',
      request_id: reqId
    });
  } catch (err) {
    console.error('Create request error:', err);
    return res.status(500).json({ error: 'Failed to post book request.' });
  }
});

export default router;

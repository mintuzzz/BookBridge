import express from 'express';
import BookRequest from '../models/BookRequest.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Get All Active Book Requests from MongoDB
router.get('/', async (req, res) => {
  try {
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
        requester_rating: p.rating || 4.8,
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
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch book requests.' });
  }
});

// 2. Create a Book Request in MongoDB
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, author, isbn, subject, department, semester, preferred_price, condition_pref, description } = req.body;

    if (!title || !subject || !department || !semester) {
      return res.status(400).json({ error: 'Please provide Title, Subject, Department, and Semester.' });
    }

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

    // Check if matching book exists in MongoDB & alert requester
    const matchingBook = await Book.findOne({
      title: { $regex: title, $options: 'i' },
      status: 'available'
    });

    if (matchingBook) {
      await Notification.create({
        user: req.user.id,
        title: '💡 Matching Book Available!',
        message: `A book matching your request "${title}" is already available for ₹${matchingBook.sellingPrice}!`,
        type: 'request',
        link: `/books/${matchingBook._id}`
      });
    }

    return res.status(201).json({
      message: 'Book request posted to campus board!',
      request_id: newReq._id.toString()
    });
  } catch (err) {
    console.error('Create request error:', err);
    return res.status(500).json({ error: 'Failed to post book request.' });
  }
});

export default router;

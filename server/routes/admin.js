import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import Book from '../models/Book.js';
import Order from '../models/Order.js';
import Exchange from '../models/Exchange.js';
import Report from '../models/Report.js';
import AdminAction from '../models/AdminAction.js';
import Session from '../models/Session.js';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import { generateToken, authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// 1. PUBLIC ADMIN LOGIN ENDPOINT
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both admin email and password.'
      });
    }

    const cleanEmail = email.toString().toLowerCase().trim();
    let user = null;
    let profile = null;

    if (isMongoConnected) {
      user = await User.findOne({ email: cleanEmail });
      if (user) {
        profile = await UserProfile.findOne({ user: user._id });
      }
    } else {
      const store = getStore();
      user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (user) {
        profile = store.userprofiles.find((p) => (p.user?._id || p.user).toString() === (user._id || user.id).toString());
      }
    }

    // Generic response if email not found or user is NOT an ADMIN (never expose user role/existence)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials or unauthorized account.'
      });
    }

    // Validate password hash using bcrypt
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials or unauthorized account.'
      });
    }

    // Generate JWT token with ADMIN role
    const token = generateToken(user, profile);

    // Create session in MongoDB
    if (isMongoConnected) {
      await Session.create({
        user: user._id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    const userPayload = {
      id: (user._id || user.id).toString(),
      full_name: profile ? profile.fullName : 'Platform Administrator',
      email: user.email,
      phone: user.phone,
      role: 'admin',
      institution: profile ? profile.institution : 'State University of Technology',
      department: profile ? profile.department : 'Administration',
      semester: profile ? profile.semester : 8,
      avatar_url: profile ? profile.avatarUrl : '',
      eco_points: profile ? profile.ecoPoints : 500,
      rating: profile ? profile.rating : 5.0
    };

    console.log(`🔐 [Admin Login Success] Admin logged in: ${user.email}`);

    return res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during admin login.'
    });
  }
});

// ==========================================
// 2. ADMIN LOGOUT ENDPOINT (Requires Auth + Admin)
// ==========================================
router.post('/logout', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (isMongoConnected) {
      await Session.deleteMany({ user: req.user.id });
    }
    console.log(`🔐 [Admin Logout Success] Terminated session for admin: ${req.user.email}`);
    return res.json({
      success: true,
      message: 'Admin session terminated successfully.'
    });
  } catch (err) {
    console.error('Admin logout error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to terminate admin session.'
    });
  }
});

// ==========================================
// PROTECTED ADMIN MIDDLEWARE GATE
// All routes below require valid JWT + ADMIN role
// ==========================================
router.use(authenticateToken);
router.use(requireAdmin);

// 3. Get Platform Statistics from MongoDB
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'STUDENT' });
    const activeListings = await Book.countDocuments({ status: 'available' });
    const soldBooks = await Book.countDocuments({ status: 'sold' });
    const totalOrders = await Order.countDocuments({});
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const totalDonations = await Book.countDocuments({ transactionType: 'donate' });
    const totalExchanges = await Exchange.countDocuments({});
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    const profiles = await UserProfile.find({}, 'ecoPoints').lean();
    const totalEcoPoints = profiles.reduce((sum, p) => sum + (p.ecoPoints || 0), 0);

    return res.json({
      users: totalUsers,
      listings: activeListings,
      sold_books: soldBooks,
      total_orders: totalOrders,
      completed_orders: completedOrders,
      donations: totalDonations,
      exchanges: totalExchanges,
      pending_reports: pendingReports,
      total_eco_points: totalEcoPoints
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
});

// 4. User Management (Get All Users from MongoDB)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    const profiles = await UserProfile.find({}).lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const formatted = users.map((u) => {
      const p = profileMap.get(u._id.toString()) || {};
      return {
        id: u._id.toString(),
        full_name: p.fullName || 'Student',
        email: u.email,
        phone: u.phone,
        role: u.role.toLowerCase(),
        status: u.status,
        institution: p.institution || 'State University',
        department: p.department || 'General',
        semester: p.semester || 1,
        eco_points: p.ecoPoints || 0,
        rating: p.rating || 5.0,
        created_at: u.createdAt
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error('Admin get users error:', err);
    return res.status(500).json({ error: 'Failed to fetch user list.' });
  }
});

// 5. Update User Status (Suspend / Activate / Ban)
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await AdminAction.create({
      admin: req.user.id,
      actionType: `user_${status}`,
      targetUser: user._id,
      notes: `Updated status of user ${user.email} to ${status}`
    });

    return res.json({ success: true, message: `User status updated to ${status}` });
  } catch (err) {
    console.error('Admin update user status error:', err);
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// 6. Book Listings Management
router.get('/listings', async (req, res) => {
  try {
    const books = await Book.find({}).populate('seller', 'email').sort({ createdAt: -1 }).lean();
    const profiles = await UserProfile.find({}).lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const formatted = books.map((b) => {
      const p = profileMap.get(b.seller?._id ? b.seller._id.toString() : (b.seller || '').toString()) || {};
      return {
        id: b._id.toString(),
        title: b.title,
        author: b.author,
        subject: b.subject,
        department: b.department,
        semester: b.semester,
        condition: b.condition,
        selling_price: b.sellingPrice,
        transaction_type: b.transactionType,
        status: b.status,
        seller_name: p.fullName || 'Student',
        seller_email: b.seller?.email || '',
        created_at: b.createdAt
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error('Admin get listings error:', err);
    return res.status(500).json({ error: 'Failed to fetch book listings.' });
  }
});

// 7. Update Listing Status (e.g. remove inappropriate book)
router.patch('/listings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const book = await Book.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
    if (!book) return res.status(404).json({ error: 'Book listing not found.' });

    await AdminAction.create({
      admin: req.user.id,
      actionType: `listing_${status}`,
      targetBook: book._id,
      notes: `Updated status of book "${book.title}" to ${status}`
    });

    return res.json({ success: true, message: `Listing status updated to ${status}` });
  } catch (err) {
    console.error('Admin update listing status error:', err);
    return res.status(500).json({ error: 'Failed to update listing status.' });
  }
});

// 8. Flagged Content & User Reports Management
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({})
      .populate('reporter', 'email')
      .populate('reportedUser', 'email')
      .populate('reportedBook', 'title')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(reports);
  } catch (err) {
    console.error('Admin get reports error:', err);
    return res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// 9. Resolve Report
router.patch('/reports/:id/resolve', async (req, res) => {
  try {
    const { actionTaken, resolutionNotes } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        actionTaken: actionTaken || 'dismissed',
        resolutionNotes: resolutionNotes || 'Resolved by administrator'
      },
      { returnDocument: 'after' }
    );

    if (!report) return res.status(404).json({ error: 'Report not found.' });

    await AdminAction.create({
      admin: req.user.id,
      actionType: 'resolve_report',
      notes: `Resolved report ${report._id}: ${actionTaken}`
    });

    return res.json({ success: true, message: 'Report resolved successfully.' });
  } catch (err) {
    console.error('Admin resolve report error:', err);
    return res.status(500).json({ error: 'Failed to resolve report.' });
  }
});

// 10. Audit Log of Admin Actions
router.get('/actions', async (req, res) => {
  try {
    const actions = await AdminAction.find({})
      .populate('admin', 'email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(actions);
  } catch (err) {
    console.error('Admin get actions error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin audit log.' });
  }
});

export default router;

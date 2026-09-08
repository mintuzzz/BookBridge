import mongoose from 'mongoose';
import express from 'express';
import bcrypt from 'bcryptjs';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import Order from '../models/Order.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import EcoPoint from '../models/EcoPoint.js';
import OrderMessage from '../models/OrderMessage.js';
import HandoverOtp from '../models/HandoverOtp.js';
import { authenticateToken } from '../middleware/auth.js';
import { emitNotification, emitOrderUpdate, emitMessageUpdate } from '../socket.js';
import { createNotification } from '../utils/notificationsHelper.js';

const router = express.Router();

async function findOrderById(orderId) {
  if (!orderId) return null;
  const idStr = orderId.toString();
  let order = null;
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    try {
      order = await Order.findById(idStr).populate('book');
    } catch (e) {}
  }
  if (!order) {
    try {
      order = await Order.findOne({ $or: [{ _id: idStr }, { id: idStr }] }).populate('book');
    } catch (e) {}
  }
  return order;
}

// Helper: Automatically generate handover code on backend
async function autoGenerateHandoverCode({ transactionId, transactionType, senderId, receiverId, meetingSpot, proposedDate }) {
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(rawOtp, 10);

  if (isMongoConnected) {
    await HandoverOtp.updateMany(
      { transactionId: transactionId.toString(), purpose: 'HANDOVER_COMPLETION', verified: false },
      { verified: true }
    );

    await HandoverOtp.create({
      transactionId: transactionId.toString(),
      transactionType,
      purpose: 'HANDOVER_COMPLETION',
      sender: senderId,
      receiver: receiverId,
      otpHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
      attempts: 0,
      verified: false
    });
  } else {
    const store = getStore();
    if (!store.pickupverifications) store.pickupverifications = [];
    store.pickupverifications.forEach((v) => {
      if ((v.transaction_id || v.transactionId)?.toString() === transactionId.toString() && v.purpose === 'HANDOVER_COMPLETION') {
        v.verified = true;
      }
    });
    store.pickupverifications.push({
      id: `otp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      transaction_id: transactionId.toString(),
      transactionId: transactionId.toString(),
      transaction_type: transactionType,
      purpose: 'HANDOVER_COMPLETION',
      sender_id: senderId,
      sender: senderId,
      receiver_id: receiverId,
      receiver: receiverId,
      otp_code: rawOtp,
      otpHash,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      attempts: 0,
      verified: false,
      created_at: new Date().toISOString()
    });
    saveStore();
  }

  // SAFE SERVER LOG (NEVER LOG ACTUAL OTP)
  console.log(`[SECURITY LOG] Handover completion code automatically generated for ${transactionType} transaction: ${transactionId}`);

  await createNotification({
    user: senderId,
    title: `🔑 Handover Code: ${rawOtp}`,
    message: `Share this 6-digit code with the buyer after handing over the book at ${meetingSpot || 'meeting'}.`,
    type: 'order',
    link: `/orders?orderId=${transactionId}`
  });

  await createNotification({
    user: receiverId,
    title: '🔑 Handover Scheduled',
    message: `Handover scheduled on ${proposedDate || 'today'} at ${meetingSpot || 'pickup spot'}. Get the 6-digit handover code from seller at handover!`,
    type: 'order',
    link: `/orders?orderId=${transactionId}`
  });

  return rawOtp;
}

// 1. Request to Buy (Buyer Flow)
router.post('/request-to-buy', authenticateToken, async (req, res) => {
  try {
    const { book_id, payment_method, pickup_notes } = req.body;
    const currentUserId = req.user.id;

    if (!book_id) {
      return res.status(400).json({ error: 'Book ID is required.' });
    }

    if (isMongoConnected) {
      const book = await Book.findById(book_id);
      if (!book) {
        return res.status(404).json({ error: 'Book listing not found.' });
      }

      if (book.seller.toString() === currentUserId) {
        return res.status(400).json({ error: 'You cannot purchase your own book listing.' });
      }

      if (book.status !== 'available') {
        return res.status(400).json({ error: 'This book listing is currently unavailable or already sold.' });
      }

      const existingRequest = await Order.findOne({
        buyer: currentUserId,
        book: book._id,
        status: { $in: ['pending', 'accepted', 'scheduled', 'reserved', 'handover_pending'] }
      });

      if (existingRequest) {
        return res.status(400).json({ error: 'You already have an active purchase request for this book listing.' });
      }

      const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const qrCodeData = `BB-VERIFY-${pickupOtp}-${orderNumber}`;

      const newOrder = await Order.create({
        orderNumber,
        buyer: currentUserId,
        seller: book.seller,
        book: book._id,
        transactionType: book.transactionType || 'buy',
        status: 'pending',
        paymentMethod: payment_method || 'upi',
        paymentStatus: 'unpaid',
        totalAmount: book.sellingPrice || 0,
        pickupOtp,
        qrCodeData,
        pickupNotes: pickup_notes || 'Meet at campus pickup location.'
      });

      try {
        const notif = await Notification.create({
          user: book.seller,
          title: '🛍️ New Purchase Request!',
          message: `${req.user.full_name || 'A student'} requested to buy your book "${book.title}" for ₹${book.sellingPrice}.`,
          type: 'order',
          link: '/orders'
        });

        // REAL-TIME PUSH
        emitNotification(book.seller, notif);
        emitOrderUpdate(currentUserId, book.seller, { type: 'request_sent', orderId: newOrder._id.toString() });
      } catch (e) {}

      return res.status(201).json({
        message: 'Purchase request sent successfully! Waiting for seller response.',
        order: newOrder
      });
    } else {
      const store = getStore();
      const book = store.books.find((b) => (b._id || b.id).toString() === book_id.toString());
      if (!book) return res.status(404).json({ error: 'Book listing not found.' });

      if (book.seller.toString() === currentUserId) {
        return res.status(400).json({ error: 'You cannot purchase your own book listing.' });
      }

      if (book.status !== 'available') {
        return res.status(400).json({ error: 'This book listing is currently unavailable or already sold.' });
      }

      const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const qrCodeData = `BB-VERIFY-${pickupOtp}-${orderNumber}`;

      const newOrder = {
        id: `ord_${Date.now()}`,
        _id: `ord_${Date.now()}`,
        orderNumber,
        buyer: currentUserId,
        seller: book.seller,
        book: book_id,
        transactionType: book.transactionType || 'buy',
        status: 'pending',
        paymentMethod: payment_method || 'upi',
        paymentStatus: 'unpaid',
        totalAmount: book.sellingPrice || 0,
        pickupOtp,
        qrCodeData,
        pickupNotes: pickup_notes || 'Meet at campus pickup location.',
        createdAt: new Date().toISOString()
      };

      store.orders.push(newOrder);
      saveStore();

      return res.status(201).json({
        message: 'Purchase request sent successfully!',
        order: newOrder
      });
    }
  } catch (err) {
    console.error('Request to buy error:', err);
    return res.status(500).json({ error: 'Failed to create purchase request.' });
  }
});

// 2. Accept Purchase Request (Seller Only)
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const currentUserId = req.user.id;

    if (isMongoConnected) {
      const order = await Order.findById(orderId).populate('book');
      if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

      if (order.seller.toString() !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized. Only the seller can accept this purchase request.' });
      }

      if (order.status !== 'pending') {
        return res.status(400).json({ error: `Cannot accept purchase request with status "${order.status}".` });
      }

      order.status = 'accepted';
      await order.save();

      if (order.book) {
        await Book.findByIdAndUpdate(order.book._id, { status: 'reserved' });
      }

      try {
        const notif = await Notification.create({
          user: order.buyer,
          title: '🎉 Purchase Request Accepted!',
          message: `${req.user.full_name || 'The seller'} accepted your purchase request for "${order.book?.title || 'the book'}"!`,
          type: 'order',
          link: '/orders'
        });

        // REAL-TIME PUSH
        emitNotification(order.buyer, notif);
        emitOrderUpdate(order.buyer, order.seller, { type: 'request_accepted', orderId: order._id.toString() });
      } catch (e) {}

      return res.json({
        success: true,
        message: 'Purchase request accepted successfully! Please coordinate handover.',
        order
      });
    } else {
      const store = getStore();
      const order = store.orders.find((o) => (o._id || o.id).toString() === orderId);
      if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

      order.status = 'accepted';
      saveStore();
      return res.json({ success: true, message: 'Purchase request accepted.', order });
    }
  } catch (err) {
    console.error('Accept purchase request error:', err);
    return res.status(500).json({ error: 'Failed to accept purchase request.' });
  }
});

// 3. Reject Purchase Request (Seller Only)
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const currentUserId = req.user.id;

    if (isMongoConnected) {
      const order = await Order.findById(orderId).populate('book');
      if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

      if (order.seller.toString() !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized. Only the seller can decline this purchase request.' });
      }

      if (order.status !== 'pending') {
        return res.status(400).json({ error: `Cannot decline purchase request with status "${order.status}".` });
      }

      order.status = 'rejected';
      await order.save();

      if (order.book) {
        await Book.findByIdAndUpdate(order.book._id, { status: 'available' });
      }

      try {
        const notif = await Notification.create({
          user: order.buyer,
          title: '❌ Purchase Request Declined',
          message: `${req.user.full_name || 'The seller'} declined your purchase request for "${order.book?.title || 'the book'}".`,
          type: 'order',
          link: '/orders'
        });

        // REAL-TIME PUSH
        emitNotification(order.buyer, notif);
        emitOrderUpdate(order.buyer, order.seller, { type: 'request_rejected', orderId: order._id.toString() });
      } catch (e) {}

      return res.json({
        success: true,
        message: 'Purchase request declined.',
        order
      });
    } else {
      const store = getStore();
      const order = store.orders.find((o) => (o._id || o.id).toString() === orderId);
      if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

      order.status = 'rejected';
      saveStore();
      return res.json({ success: true, message: 'Purchase request declined.', order });
    }
  } catch (err) {
    console.error('Reject purchase request error:', err);
    return res.status(500).json({ error: 'Failed to decline purchase request.' });
  }
});

// 4. Propose Handover Schedule
router.post('/:id/propose-schedule', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { meeting_spot, proposed_date, start_time, end_time } = req.body;
    const currentUserIdStr = req.user.id.toString();

    if (!meeting_spot || !proposed_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Please provide meeting spot, date, start time, and end time.' });
    }

    let order = null;
    let buyerIdStr = '';
    let sellerIdStr = '';

    if (isMongoConnected) {
      order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

      buyerIdStr = (order.buyer?._id || order.buyer).toString();
      sellerIdStr = (order.seller?._id || order.seller).toString();

      if (currentUserIdStr !== buyerIdStr && currentUserIdStr !== sellerIdStr) {
        return res.status(403).json({ error: 'Unauthorized. Only buyer or seller can schedule handover.' });
      }

      if (!['accepted', 'scheduled', 'handover_pending'].includes(order.status)) {
        return res.status(400).json({ error: `Cannot schedule handover for request with status "${order.status}".` });
      }

      order.meetingSpot = meeting_spot;
      order.proposedDate = proposed_date;
      order.proposedStartTime = start_time;
      order.proposedEndTime = end_time;
      order.proposedBy = currentUserIdStr;
      order.scheduleConfirmedBy = null;

      await order.save();
    } else {
      const store = getStore();
      order = (store.orders || []).find((o) => (o.id || o._id).toString() === orderId);
      if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

      buyerIdStr = (order.buyer || order.buyer_id).toString();
      sellerIdStr = (order.seller || order.seller_id).toString();

      if (currentUserIdStr !== buyerIdStr && currentUserIdStr !== sellerIdStr) {
        return res.status(403).json({ error: 'Unauthorized. Only buyer or seller can schedule handover.' });
      }

      if (!['accepted', 'scheduled', 'handover_pending'].includes(order.status)) {
        return res.status(400).json({ error: `Cannot schedule handover for request with status "${order.status}".` });
      }

      order.meetingSpot = meeting_spot;
      order.meeting_spot = meeting_spot;
      order.proposedDate = proposed_date;
      order.proposed_date = proposed_date;
      order.proposedStartTime = start_time;
      order.start_time = start_time;
      order.proposedEndTime = end_time;
      order.end_time = end_time;
      order.proposedBy = currentUserIdStr;
      order.proposed_by = currentUserIdStr;
      order.scheduleConfirmedBy = null;
      order.confirmed_by = null;

      saveStore();
    }

    const peerIdStr = currentUserIdStr === buyerIdStr ? sellerIdStr : buyerIdStr;
    const proposerName = req.user.full_name || 'Your transaction partner';

    await createNotification({
      user: peerIdStr,
      type: 'order',
      title: '📅 Meeting Schedule Proposed',
      message: `${proposerName} proposed a meeting at ${meeting_spot} on ${proposed_date} from ${start_time} to ${end_time}.`,
      link: `/orders?orderId=${orderId}`,
      relatedBook: (order.book?._id || order.book || order.book_id || '').toString()
    });

    emitOrderUpdate(buyerIdStr, sellerIdStr, { type: 'schedule_proposed', orderId });

    return res.json({
      success: true,
      message: 'Meeting schedule proposed successfully.',
      order
    });
  } catch (err) {
    console.error('Propose order schedule error:', err);
    return res.status(500).json({ error: 'Unable to propose the meeting schedule. Please try again.' });
  }
});

// 5. Confirm Handover Schedule & AUTOMATICALLY GENERATE HANDOVER COMPLETION CODE
router.post('/:id/confirm-schedule', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const currentUserIdStr = req.user.id.toString();

    let order = null;
    let buyerIdStr = '';
    let sellerIdStr = '';

    if (isMongoConnected) {
      order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

      buyerIdStr = (order.buyer?._id || order.buyer).toString();
      sellerIdStr = (order.seller?._id || order.seller).toString();

      if (currentUserIdStr !== buyerIdStr && currentUserIdStr !== sellerIdStr) {
        return res.status(403).json({ error: 'Unauthorized. Only buyer or seller can confirm handover schedule.' });
      }

      if (order.proposedBy && order.proposedBy.toString() === currentUserIdStr) {
        return res.status(400).json({ error: 'You cannot confirm a schedule you proposed yourself. Peer student must agree.' });
      }

      if (!['accepted', 'scheduled', 'handover_pending'].includes(order.status)) {
        return res.status(400).json({ error: `Cannot confirm schedule for request with status "${order.status}".` });
      }

      order.status = 'handover_pending';
      order.scheduleConfirmedBy = currentUserIdStr;
      order.scheduledAt = new Date();

      await order.save();
    } else {
      const store = getStore();
      order = (store.orders || []).find((o) => (o.id || o._id).toString() === orderId);
      if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

      buyerIdStr = (order.buyer || order.buyer_id).toString();
      sellerIdStr = (order.seller || order.seller_id).toString();

      if (currentUserIdStr !== buyerIdStr && currentUserIdStr !== sellerIdStr) {
        return res.status(403).json({ error: 'Unauthorized. Only buyer or seller can confirm handover schedule.' });
      }

      const proposedByStr = (order.proposedBy || order.proposed_by || '').toString();
      if (proposedByStr === currentUserIdStr) {
        return res.status(400).json({ error: 'You cannot confirm a schedule you proposed yourself. Peer student must agree.' });
      }

      order.status = 'handover_pending';
      order.scheduleConfirmedBy = currentUserIdStr;
      order.confirmed_by = currentUserIdStr;
      order.scheduledAt = new Date().toISOString();
      order.scheduled_at = new Date().toISOString();

      saveStore();
    }

    const meetingSpot = order.meetingSpot || order.meeting_spot || 'Campus grounds';
    const proposedDate = order.proposedDate || order.proposed_date || 'Today';

    const rawOtp = await autoGenerateHandoverCode({
      transactionId: orderId,
      transactionType: order.transactionType || 'buy',
      senderId: sellerIdStr,
      receiverId: buyerIdStr,
      meetingSpot,
      proposedDate
    });

    const peerIdStr = currentUserIdStr === buyerIdStr ? sellerIdStr : buyerIdStr;
    await createNotification({
      user: peerIdStr,
      type: 'order',
      title: '✅ Meeting Schedule Confirmed!',
      message: `${req.user.full_name || 'Student'} confirmed the proposed handover meeting schedule.`,
      link: `/orders?orderId=${orderId}`
    });

    emitOrderUpdate(buyerIdStr, sellerIdStr, { type: 'schedule_confirmed', orderId });

    return res.json({
      success: true,
      message: 'Handover meeting schedule confirmed!',
      status: 'handover_pending',
      handover_code_generated: true,
      handover_code: currentUserIdStr === sellerIdStr ? rawOtp : undefined
    });
  } catch (err) {
    console.error('Confirm order schedule error:', err);
    return res.status(500).json({ error: 'Failed to confirm handover schedule.' });
  }
});

// 6. Verify Handover Completion OTP (Buyer / Recipient ONLY)
router.post('/:id/verify-handover-otp', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { otp } = req.body;
    const currentUserId = req.user.id.toString();

    console.log(`[SECURITY LOG] Handover code verification requested for Order ID: ${orderId} by user: ${currentUserId}`);

    if (!otp || !/^\d{6}$/.test(otp.toString().trim())) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: Invalid OTP format`);
      return res.status(400).json({
        success: false,
        message: 'Invalid handover code format. Must be exactly 6 digits.'
      });
    }

    let order = null;
    let buyerIdStr = '';
    let sellerIdStr = '';

    if (isMongoConnected) {
      order = await findOrderById(orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Purchase request not found.' });

      buyerIdStr = (order.buyer?._id || order.buyer).toString();
      sellerIdStr = (order.seller?._id || order.seller).toString();

      if (order.status === 'completed') {
        console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: Already completed`);
        return res.status(400).json({ success: false, message: 'This transaction has already been completed.' });
      }

      if (order.status === 'cancelled' || order.status === 'rejected') {
        return res.status(400).json({ success: false, message: `Cannot verify completion code for request with status "${order.status}".` });
      }

      const otpRecord = await HandoverOtp.findOne({
        transactionId: orderId.toString(),
        purpose: 'HANDOVER_COMPLETION'
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: OTP record not found`);
        return res.status(400).json({
          success: false,
          message: 'Handover code not found. Please request a new code.'
        });
      }

      if (otpRecord.sender.toString() === currentUserId) {
        console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: Seller self-verification blocked`);
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. The seller cannot complete the transaction alone. The buyer must enter the handover code.'
        });
      }

      if (otpRecord.receiver.toString() !== currentUserId) {
        console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: Unauthorized third-party user`);
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. Only the buyer can submit the handover code.'
        });
      }

      if (otpRecord.verified) {
        console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: Reused OTP`);
        return res.status(400).json({
          success: false,
          message: 'Handover code has already been used.'
        });
      }

      if (otpRecord.expiresAt && new Date() > new Date(otpRecord.expiresAt)) {
        console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: Expired OTP`);
        return res.status(400).json({
          success: false,
          message: 'Handover code has expired.'
        });
      }

      if (otpRecord.attempts >= 5) {
        console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: Max 5 attempts exceeded`);
        return res.status(400).json({
          success: false,
          message: 'Too many verification attempts. Please request a new code.'
        });
      }

      let isMatch = false;
      if (otpRecord.otpHash) {
        isMatch = await bcrypt.compare(otp.toString().trim(), otpRecord.otpHash);
      } else {
        isMatch = (otpRecord.otp_code || '').toString().trim() === otp.toString().trim();
      }

      if (!isMatch) {
        otpRecord.attempts = (otpRecord.attempts || 0) + 1;
        await otpRecord.save();
        console.log(`[SECURITY LOG] Handover code verification FAILED for Order ID: ${orderId}. Reason: Hash mismatch (Wrong code)`);
        return res.status(400).json({
          success: false,
          message: 'Invalid handover code.'
        });
      }

      console.log(`[SECURITY LOG] Handover code verification SUCCESS for Order ID: ${orderId}`);

      otpRecord.verified = true;
      await otpRecord.save();

      order.status = 'completed';
      order.paymentStatus = 'paid_at_pickup';
      order.completedAt = new Date();
      await order.save();

      if (order.book) {
        const bookId = (order.book._id || order.book).toString();
        if (mongoose.Types.ObjectId.isValid(bookId)) {
          await Book.findByIdAndUpdate(bookId, { status: 'sold' });
        } else {
          await Book.findOneAndUpdate({ $or: [{ _id: bookId }, { id: bookId }] }, { status: 'sold' });
        }
      }

      try {
        await EcoPoint.create({ user: order.seller, points: 25, action: 'reuse', description: 'Earned +25 Eco Points for completed book sale' });
        await UserProfile.findOneAndUpdate({ user: order.seller }, { $inc: { ecoPoints: 25 } });
        await UserProfile.findOneAndUpdate({ user: order.buyer }, { $inc: { ecoPoints: 15 } });
      } catch (e) {}
    } else {
      const store = getStore();
      order = (store.orders || []).find((o) => (o.id || o._id).toString() === orderId.toString());
      if (!order) return res.status(404).json({ success: false, message: 'Purchase request not found.' });

      buyerIdStr = (order.buyer || order.buyer_id).toString();
      sellerIdStr = (order.seller || order.seller_id).toString();

      if (order.status === 'completed') {
        return res.status(400).json({ success: false, message: 'This transaction has already been completed.' });
      }

      if (order.status === 'cancelled' || order.status === 'rejected') {
        return res.status(400).json({ success: false, message: `Cannot verify completion code for request with status "${order.status}".` });
      }

      const otpRecord = (store.pickupverifications || [])
        .filter((v) => (v.transaction_id || v.transactionId)?.toString() === orderId.toString())
        .reverse()[0];

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'Handover code not found. Please request a new code.'
        });
      }

      const senderIdStr = (otpRecord.sender_id || otpRecord.sender || '').toString();
      const receiverIdStr = (otpRecord.receiver_id || otpRecord.receiver || '').toString();

      if (senderIdStr && senderIdStr === currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. The seller cannot complete the transaction alone. The buyer must enter the handover code.'
        });
      }

      if (receiverIdStr && receiverIdStr !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. Only the buyer can submit the handover code.'
        });
      }

      if (otpRecord.verified) {
        return res.status(400).json({
          success: false,
          message: 'Handover code has already been used.'
        });
      }

      const expiresAt = otpRecord.expiresAt || otpRecord.expires_at;
      if (expiresAt && new Date() > new Date(expiresAt)) {
        return res.status(400).json({
          success: false,
          message: 'Handover code has expired.'
        });
      }

      if (otpRecord.attempts && otpRecord.attempts >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Too many verification attempts. Please request a new code.'
        });
      }

      let isMatch = false;
      if (otpRecord.otpHash) {
        isMatch = await bcrypt.compare(otp.toString().trim(), otpRecord.otpHash);
      } else {
        isMatch = (otpRecord.otp_code || '').toString().trim() === otp.toString().trim();
      }

      if (!isMatch) {
        otpRecord.attempts = (otpRecord.attempts || 0) + 1;
        saveStore();
        return res.status(400).json({
          success: false,
          message: 'Invalid handover code.'
        });
      }

      otpRecord.verified = true;

      order.status = 'completed';
      order.payment_status = 'paid_at_pickup';
      order.paymentStatus = 'paid_at_pickup';
      order.completedAt = new Date().toISOString();
      order.completed_at = new Date().toISOString();

      const bookObj = (store.books || []).find((b) => (b.id || b._id).toString() === (order.book || order.book_id).toString());
      if (bookObj) bookObj.status = 'sold';

      saveStore();
    }

    await createNotification({
      user: sellerIdStr,
      type: 'order',
      title: '🎉 Handover Verified!',
      message: 'The buyer verified the handover code! Your book sale & payment is completed.',
      link: `/orders?orderId=${orderId}`
    });

    emitOrderUpdate(buyerIdStr, sellerIdStr, { type: 'order_completed', orderId });

    return res.json({
      success: true,
      message: '🎉 Handover code verified cleanly! Sale & payment completed.',
      status: 'completed'
    });
  } catch (err) {
    console.error('Verify order handover OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify handover code.' });
  }
});

// 7. Send Order Message (Participants Only)
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { message } = req.body;
    const currentUserId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

    const buyerId = order.buyer.toString();
    const sellerId = order.seller.toString();

    if (currentUserId !== buyerId && currentUserId !== sellerId) {
      return res.status(403).json({ error: 'Unauthorized. Only transaction participants can send messages.' });
    }

    const receiverId = currentUserId === buyerId ? order.seller : order.buyer;

    const newMessage = await OrderMessage.create({
      order: orderId,
      sender: currentUserId,
      receiver: receiverId,
      message: message.trim()
    });

    if (isMongoConnected) {
      try {
        const notif = await Notification.create({
          user: receiverId,
          title: '💬 New Transaction Message',
          message: `${req.user.full_name || 'Student'}: "${message.trim().slice(0, 45)}..."`,
          type: 'order',
          link: '/orders'
        });

        // REAL-TIME PUSH
        emitNotification(receiverId, notif);
        emitMessageUpdate(currentUserId, receiverId, { type: 'order_message', data: newMessage });
      } catch (e) {}
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent cleanly.',
      data: newMessage
    });
  } catch (err) {
    console.error('Send order message error:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

// 8. Get Order Messages (Participants Only)
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const currentUserId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

    const buyerId = order.buyer.toString();
    const sellerId = order.seller.toString();

    if (currentUserId !== buyerId && currentUserId !== sellerId) {
      return res.status(403).json({ error: 'Unauthorized. Only transaction participants can view messages.' });
    }

    const messages = await OrderMessage.find({ order: orderId })
      .populate('sender', 'email phone')
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map((m) => ({
      id: m._id.toString(),
      order_id: m.order.toString(),
      sender_id: (m.sender?._id || m.sender).toString(),
      receiver_id: m.receiver.toString(),
      message: m.message,
      created_at: m.createdAt
    }));

    return res.json(formattedMessages);
  } catch (err) {
    console.error('Fetch order messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// 9. Mark Sale & Payment Completed (Guarded by Handover OTP Verification)
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Purchase request not found.' });

    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'Handover verification code required. Complete the 6-digit code verification at physical meeting.' });
    }

    return res.json({
      success: true,
      message: 'Book sale completed successfully!',
      status: 'completed'
    });
  } catch (err) {
    console.error('Complete order error:', err);
    return res.status(500).json({ error: 'Failed to complete transaction.' });
  }
});

// 10. Get User Orders
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id.toString();

    if (isMongoConnected) {
      const orders = await Order.find({
        $or: [{ buyer: currentUserId }, { seller: currentUserId }]
      })
        .populate('buyer', 'email phone role')
        .populate('seller', 'email phone role')
        .sort({ createdAt: -1 })
        .lean();

      const userIds = [...new Set(orders.flatMap((o) => [o.buyer?._id || o.buyer, o.seller?._id || o.seller]).map((id) => id?.toString()).filter(Boolean))];
      const profiles = await UserProfile.find({ user: { $in: userIds } }).lean();
      const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

      const rawBookIds = orders.map((o) => (o.book?._id || o.book)?.toString()).filter(Boolean);
      const bookIds = [...new Set(rawBookIds)];
      const books = await Book.find({ _id: { $in: bookIds } }).lean();
      const bookMap = new Map(books.map((b) => [(b._id || b.id).toString(), b]));

      const activeOtps = await HandoverOtp.find({
        transactionId: { $in: orders.map((o) => o._id.toString()) },
        purpose: 'HANDOVER_COMPLETION',
        verified: false
      }).sort({ createdAt: -1 }).lean();

      const otpMap = new Map(activeOtps.map((o) => [o.transactionId, o]));

      const senderNotifications = await Notification.find({
        user: currentUserId,
        title: { $regex: '🔑 Handover Code: ' }
      }).sort({ createdAt: -1 }).lean();

      const formattedOrders = orders.map((o) => {
        const buyerIdStr = (o.buyer?._id || o.buyer).toString();
        const sellerIdStr = (o.seller?._id || o.seller).toString();
        const buyerProf = profileMap.get(buyerIdStr) || {};
        const sellerProf = profileMap.get(sellerIdStr) || {};
        const bookIdStr = (o.book?._id || o.book || '').toString();
        const b = bookMap.get(bookIdStr) || (typeof o.book === 'object' && o.book !== null ? o.book : {});
        const activeOtp = otpMap.get(o._id.toString());

        let senderHandoverCode = null;
        if (activeOtp && activeOtp.sender.toString() === currentUserId) {
          const matchedNotif = senderNotifications.find((n) => n.title.includes('🔑 Handover Code: '));
          if (matchedNotif) {
            const match = matchedNotif.title.match(/🔑 Handover Code: (\d{6})/);
            if (match) senderHandoverCode = match[1];
          }
        }

        return {
          id: o._id.toString(),
          order_number: o.orderNumber,
          buyer_id: buyerIdStr,
          seller_id: sellerIdStr,
          book_id: bookIdStr || (b._id || b.id || '').toString(),
          book_title: b.title || 'Textbook',
          book_author: b.author || '',
          book_condition: b.condition || 'Very Good',
          images: b.images || [],
          pickup_location: b.location || 'Central Library Grounds',
          transaction_type: o.transactionType || 'buy',
          status: o.status,
          payment_method: o.paymentMethod,
          payment_status: o.paymentStatus,
          total_amount: o.totalAmount,
          pickup_notes: o.pickupNotes,
          meeting_spot: o.meetingSpot || '',
          proposed_date: o.proposedDate || '',
          start_time: o.proposedStartTime || '',
          end_time: o.proposedEndTime || '',
          proposed_by: o.proposedBy ? o.proposedBy.toString() : null,
          confirmed_by: o.scheduleConfirmedBy ? o.scheduleConfirmedBy.toString() : null,
          scheduled_at: o.scheduledAt,
          completed_at: o.completedAt,
          has_active_handover_otp: !!activeOtp,
          handover_code: senderHandoverCode,
          buyer_name: buyerProf.fullName || 'Buyer Student',
          buyer_phone: o.buyer?.phone || '',
          buyer_avatar: buyerProf.avatarUrl || '',
          buyer_rating: buyerProf.rating || 4.8,
          seller_name: sellerProf.fullName || 'Seller Student',
          seller_phone: o.seller?.phone || '',
          seller_avatar: sellerProf.avatarUrl || '',
          seller_rating: sellerProf.rating || 4.8,
          is_buyer: buyerIdStr === currentUserId,
          created_at: o.createdAt
        };
      });

      return res.json(formattedOrders);
    } else {
      const store = getStore();
      const userOrders = store.orders.filter(
        (o) => (o.buyer?._id || o.buyer).toString() === currentUserId || (o.seller?._id || o.seller).toString() === currentUserId
      );

      const formattedOrders = userOrders.map((o) => {
        const otps = store.pickupverifications || [];
        const activeOtp = otps.find(
          (v) => (v.transaction_id || v.transactionId)?.toString() === (o.id || o._id)?.toString() && !v.verified
        );
        let senderHandoverCode = activeOtp && (activeOtp.sender_id || activeOtp.sender)?.toString() === currentUserId ? activeOtp.otp_code : null;

        const bookId = (o.book?._id || o.book || o.book_id || '').toString();
        const book = (store.books || []).find((b) => (b.id || b._id).toString() === bookId) || {};

        const buyerIdStr = (o.buyer?._id || o.buyer || o.buyer_id || '').toString();
        const sellerIdStr = (o.seller?._id || o.seller || o.seller_id || '').toString();

        const buyerUser = (store.users || []).find((u) => (u.id || u._id).toString() === buyerIdStr) || {};
        const sellerUser = (store.users || []).find((u) => (u.id || u._id).toString() === sellerIdStr) || {};

        const buyerProf = (store.userprofiles || []).find((p) => (p.user || p.user_id)?.toString() === buyerIdStr) || {};
        const sellerProf = (store.userprofiles || []).find((p) => (p.user || p.user_id)?.toString() === sellerIdStr) || {};

        return {
          id: (o._id || o.id).toString(),
          order_number: o.orderNumber,
          buyer_id: buyerIdStr,
          seller_id: sellerIdStr,
          book_id: (book._id || book.id || '').toString(),
          book_title: book.title || 'Textbook',
          book_author: book.author || '',
          book_condition: book.condition || 'Very Good',
          images: book.images || [],
          pickup_location: book.location || 'Central Library',
          transaction_type: o.transactionType,
          status: o.status,
          payment_method: o.paymentMethod,
          payment_status: o.paymentStatus,
          total_amount: o.totalAmount,
          pickup_notes: o.pickupNotes,
          meeting_spot: o.meetingSpot || o.meeting_spot || '',
          proposed_date: o.proposedDate || o.proposed_date || '',
          start_time: o.proposedStartTime || o.start_time || '',
          end_time: o.proposedEndTime || o.end_time || '',
          proposed_by: o.proposedBy || o.proposed_by || null,
          confirmed_by: o.scheduleConfirmedBy || o.confirmed_by || null,
          scheduled_at: o.scheduledAt || o.scheduled_at,
          completed_at: o.completedAt || o.completed_at,
          has_active_handover_otp: !!activeOtp,
          handover_code: senderHandoverCode,
          buyer_name: buyerProf.fullName || 'Buyer Student',
          buyer_phone: buyerUser.phone || '',
          buyer_avatar: buyerProf.avatarUrl || '',
          buyer_rating: buyerProf.rating || 4.8,
          seller_name: sellerProf.fullName || 'Seller Student',
          seller_phone: sellerUser.phone || '',
          seller_avatar: sellerProf.avatarUrl || '',
          seller_rating: sellerProf.rating || 4.8,
          is_buyer: buyerIdStr === currentUserId,
          created_at: o.createdAt
        };
      });

      formattedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json(formattedOrders);
    }
  } catch (err) {
    console.error('Fetch my-orders error:', err);
    return res.status(500).json({ error: 'Failed to fetch user orders.' });
  }
});

export default router;

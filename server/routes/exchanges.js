import mongoose from 'mongoose';
import express from 'express';
import bcrypt from 'bcryptjs';
import Exchange from '../models/Exchange.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import Notification from '../models/Notification.js';
import EcoPoint from '../models/EcoPoint.js';
import ExchangeMessage from '../models/ExchangeMessage.js';
import HandoverOtp from '../models/HandoverOtp.js';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { emitNotification, emitExchangeUpdate, emitMessageUpdate } from '../socket.js';
import { titlesMatch, normalizeTitle } from '../utils/titleNormalizer.js';
import { createNotification } from '../utils/notificationsHelper.js';

const router = express.Router();

async function findExchangeById(exchangeId) {
  if (!exchangeId) return null;
  const idStr = exchangeId.toString();
  let exchange = null;
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    try {
      exchange = await Exchange.findById(idStr);
    } catch (e) {}
  }
  if (!exchange) {
    try {
      exchange = await Exchange.findOne({ $or: [{ _id: idStr }, { id: idStr }] });
    } catch (e) {}
  }
  return exchange;
}

// Helper: Automatically generate handover code on backend
async function autoGenerateHandoverCode({ transactionId, transactionType, senderId, receiverId, meetingSpot, proposedDate }) {
  if (isMongoConnected) {
    await HandoverOtp.updateMany(
      { transactionId: transactionId.toString(), purpose: 'HANDOVER_COMPLETION', verified: false },
      { verified: true }
    );
  }

  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(rawOtp, 10);

  if (isMongoConnected) {
    await HandoverOtp.create({
      transactionId: transactionId.toString(),
      transactionType,
      purpose: 'HANDOVER_COMPLETION',
      sender: senderId,
      receiver: receiverId,
      otpHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      attempts: 0,
      verified: false
    });
  } else {
    const store = getStore();
    if (!store.pickupverifications) store.pickupverifications = [];
    store.pickupverifications.push({
      id: `otp_${Date.now()}`,
      transaction_id: transactionId.toString(),
      transaction_type: transactionType,
      sender_id: senderId,
      receiver_id: receiverId,
      otp_code: rawOtp,
      verified: false,
      created_at: new Date().toISOString()
    });
    saveStore();
  }

  console.log(`[SECURITY LOG] Handover completion code automatically generated for ${transactionType} transaction: ${transactionId}`);

  // Notify Sender with Code
  await createNotification({
    user: senderId,
    title: `🔑 Handover Code: ${rawOtp}`,
    message: `Share this 6-digit code with the recipient after handing over the book at ${meetingSpot || 'meeting'}.`,
    type: 'exchange',
    link: '/exchanges'
  });

  // Notify Receiver WITHOUT Code
  await createNotification({
    user: receiverId,
    title: '🔑 Handover Scheduled',
    message: `Meeting scheduled on ${proposedDate || 'today'} at ${meetingSpot || 'campus spot'}. Get the 6-digit handover code from book provider at handover!`,
    type: 'exchange',
    link: '/exchanges'
  });

  return rawOtp;
}

// 1. Get Reciprocal Exchange Matches for Current User
router.get('/matches', authenticateToken, async (req, res) => {
  try {
    const currentUserIdStr = req.user.id.toString();

    let myExchangeBooks = [];
    let otherExchangeBooks = [];
    let profileMap = new Map();

    if (isMongoConnected) {
      myExchangeBooks = await Book.find({
        seller: req.user.id,
        $or: [{ transactionType: 'exchange' }, { transaction_type: 'exchange' }],
        status: 'available'
      }).lean();

      otherExchangeBooks = await Book.find({
        seller: { $ne: req.user.id },
        $or: [{ transactionType: 'exchange' }, { transaction_type: 'exchange' }],
        status: 'available'
      })
        .populate('seller', 'email phone role')
        .lean();

      const otherSellerIds = otherExchangeBooks.map((b) => (b.seller?._id || b.seller).toString());
      const profiles = await UserProfile.find({ user: { $in: otherSellerIds } }).lean();
      profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));
    } else {
      const store = getStore();
      const allBooks = store.books || [];

      myExchangeBooks = allBooks.filter((b) => {
        const bSellerStr = (b.seller?._id || b.seller || '').toString();
        const bTransType = (b.transactionType || b.transaction_type || '').toLowerCase();
        return bSellerStr === currentUserIdStr && bTransType === 'exchange' && b.status === 'available';
      });

      otherExchangeBooks = allBooks.filter((b) => {
        const bSellerStr = (b.seller?._id || b.seller || '').toString();
        const bTransType = (b.transactionType || b.transaction_type || '').toLowerCase();
        return bSellerStr !== currentUserIdStr && bTransType === 'exchange' && b.status === 'available';
      });

      const profiles = store.userprofiles || [];
      profileMap = new Map(profiles.map((p) => [p.user?.toString(), p]));
    }

    const matches = [];

    for (const myBook of myExchangeBooks) {
      const myBookIdStr = (myBook._id || myBook.id).toString();
      const myWanted = myBook.wantedBookTitle || myBook.wanted_book_title || '';
      const myTitle = myBook.title || '';

      for (const otherBook of otherExchangeBooks) {
        const otherSellerIdStr = (otherBook.seller?._id || otherBook.seller || '').toString();

        // REQ 2: EXCLUDE OWN LISTINGS
        if (currentUserIdStr === otherSellerIdStr) continue;

        const otherBookIdStr = (otherBook._id || otherBook.id).toString();
        const otherWanted = otherBook.wantedBookTitle || otherBook.wanted_book_title || '';
        const otherTitle = otherBook.title || '';

        // REQ 1: RECIPROCAL MATCHING LOGIC
        // Direction A: My wanted book matches Other offered book
        const isMyWantedMatch = titlesMatch(myWanted, otherTitle);
        // Direction B: Other wanted book matches My offered book
        const isOtherWantedMatch = titlesMatch(otherWanted, myTitle);

        let matchLevel = null;
        let matchReason = '';

        if (isMyWantedMatch && isOtherWantedMatch) {
          matchLevel = 'perfect';
          matchReason = `🎉 100% Perfect Reciprocal Exchange! Both of your requested book titles directly match each other's listings in ${myBook.department}.`;
        } else if (isMyWantedMatch || isOtherWantedMatch) {
          matchLevel = 'strong';
          matchReason = `⭐ Strong Match: One of your requested book titles directly matches this student's listing in ${myBook.department}.`;
        }

        if (matchLevel) {
          const p = profileMap.get(otherSellerIdStr) || {};
          matches.push({
            id: `MATCH-${myBookIdStr}-${otherBookIdStr}`,
            my_book: {
              id: myBookIdStr,
              ...myBook
            },
            target_book: {
              id: otherBookIdStr,
              owner_name: p.fullName || 'Verified Student',
              owner_rating: p.rating || 0,
              owner_avatar: p.avatarUrl || '',
              owner_dept: p.department || otherBook.department || 'Computer Science',
              ...otherBook
            },
            match_level: matchLevel,
            match_reason: matchReason
          });
        }
      }
    }

    matches.sort((a, b) => {
      const order = { perfect: 1, strong: 2, possible: 3 };
      return order[a.match_level] - order[b.match_level];
    });

    return res.json(matches);
  } catch (err) {
    console.error('Fetch exchange matches error:', err);
    return res.status(500).json({ error: 'Failed to find exchange matches.' });
  }
});

// 2. Request Exchange
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { offered_book_id, requested_book_id, match_level, match_reason } = req.body;
    const senderIdStr = req.user.id.toString();

    if (!offered_book_id || !requested_book_id) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both offered_book_id and requested_book_id.'
      });
    }

    let requestedBook = null;
    let offeredBook = null;

    if (isMongoConnected) {
      requestedBook = await Book.findById(requested_book_id);
      offeredBook = await Book.findById(offered_book_id);
    } else {
      const store = getStore();
      requestedBook = (store.books || []).find((b) => (b.id || b._id).toString() === requested_book_id.toString());
      offeredBook = (store.books || []).find((b) => (b.id || b._id).toString() === offered_book_id.toString());
    }

    if (!requestedBook || !offeredBook) {
      return res.status(404).json({
        success: false,
        error: 'One or both books not found.'
      });
    }

    const recipientIdStr = (requestedBook.seller?._id || requestedBook.seller).toString();
    const offeredBookSellerStr = (offeredBook.seller?._id || offeredBook.seller).toString();

    // Self Proposal Check
    if (recipientIdStr === senderIdStr) {
      return res.status(400).json({
        success: false,
        error: 'You cannot send an exchange proposal to yourself.'
      });
    }

    if (offeredBookSellerStr !== senderIdStr) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. You can only offer books that belong to your account.'
      });
    }

    if (requestedBook.status !== 'available' || offeredBook.status !== 'available') {
      return res.status(400).json({
        success: false,
        error: 'One or both book listings are no longer available for exchange.'
      });
    }

    // Check duplicate active proposals
    let proposalId = '';
    let newExchange = null;

    if (isMongoConnected) {
      const existingProposal = await Exchange.findOne({
        $or: [
          { requester: senderIdStr, owner: recipientIdStr, offeredBook: offered_book_id, requestedBook: requested_book_id },
          { requester: recipientIdStr, owner: senderIdStr, offeredBook: requested_book_id, requestedBook: offered_book_id }
        ],
        status: { $in: ['pending', 'accepted', 'scheduled', 'handover_pending'] }
      });

      if (existingProposal) {
        return res.status(400).json({
          success: false,
          error: 'An active exchange proposal already exists for these books.'
        });
      }

      newExchange = await Exchange.create({
        requester: senderIdStr,
        owner: recipientIdStr,
        offeredBook: offered_book_id,
        requestedBook: requested_book_id,
        matchLevel: match_level || 'strong',
        matchReason: match_reason || 'Direct exchange request sent by student.',
        status: 'pending'
      });
      proposalId = newExchange._id.toString();
    } else {
      const store = getStore();
      if (!store.exchanges) store.exchanges = [];

      const existingProposal = store.exchanges.find((e) => {
        const reqStr = (e.requester?._id || e.requester || e.requester_id).toString();
        const ownStr = (e.owner?._id || e.owner || e.owner_id).toString();
        const offStr = (e.offeredBook?._id || e.offeredBook || e.offered_book_id).toString();
        const reqBStr = (e.requestedBook?._id || e.requestedBook || e.requested_book_id).toString();

        const match1 = reqStr === senderIdStr && ownStr === recipientIdStr && offStr === offered_book_id.toString() && reqBStr === requested_book_id.toString();
        const match2 = reqStr === recipientIdStr && ownStr === senderIdStr && offStr === requested_book_id.toString() && reqBStr === offered_book_id.toString();
        return (match1 || match2) && ['pending', 'accepted', 'scheduled', 'handover_pending'].includes(e.status);
      });

      if (existingProposal) {
        return res.status(400).json({
          success: false,
          error: 'An active exchange proposal already exists for these books.'
        });
      }

      proposalId = `ex_${Date.now()}`;
      newExchange = {
        id: proposalId,
        _id: proposalId,
        requester: senderIdStr,
        requester_id: senderIdStr,
        owner: recipientIdStr,
        owner_id: recipientIdStr,
        offeredBook: offered_book_id.toString(),
        offered_book_id: offered_book_id.toString(),
        requestedBook: requested_book_id.toString(),
        requested_book_id: requested_book_id.toString(),
        matchLevel: match_level || 'strong',
        matchReason: match_reason || 'Direct exchange request sent by student.',
        status: 'pending',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      store.exchanges.unshift(newExchange);
      saveStore();
    }

    // REQ 5: SEND NOTIFICATION TO RECIPIENT
    await createNotification({
      user: recipientIdStr,
      type: 'exchange',
      title: '🔄 New Exchange Request',
      message: `${req.user.full_name || 'A student'} wants to exchange "${offeredBook.title}" for your "${requestedBook.title}".`,
      link: '/exchanges',
      relatedExchange: proposalId,
      relatedBook: requested_book_id
    });

    emitExchangeUpdate(senderIdStr, recipientIdStr, { type: 'proposal_sent', exchangeId: proposalId });

    return res.status(201).json({
      success: true,
      message: 'Exchange proposal sent successfully.',
      proposal: {
        id: proposalId,
        status: 'pending',
        requester_id: senderIdStr,
        owner_id: recipientIdStr
      },
      exchange_id: proposalId
    });
  } catch (err) {
    console.error('Exchange request error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to send exchange proposal.'
    });
  }
});

// 3. Get User's Exchange Proposals
router.get('/my-exchanges', authenticateToken, async (req, res) => {
  try {
    const currentUserIdStr = req.user.id.toString();

    if (isMongoConnected) {
      const exchanges = await Exchange.find({
        $or: [{ requester: req.user.id }, { owner: req.user.id }]
      })
        .populate('requester', 'email phone role')
        .populate('owner', 'email phone role')
        .populate('offeredBook')
        .populate('requestedBook')
        .sort({ createdAt: -1 })
        .lean();

      const requesterIds = exchanges.map((e) => e.requester?._id || e.requester);
      const ownerIds = exchanges.map((e) => e.owner?._id || e.owner);
      const allUserIds = [...new Set([...requesterIds, ...ownerIds].map((id) => id?.toString()).filter(Boolean))];

      const profiles = await UserProfile.find({ user: { $in: allUserIds } }).lean();
      const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

      const activeOtps = await HandoverOtp.find({
        transactionId: { $in: exchanges.map((e) => e._id.toString()) },
        purpose: 'HANDOVER_COMPLETION',
        verified: false
      }).sort({ createdAt: -1 }).lean();

      const otpMap = new Map(activeOtps.map((o) => [o.transactionId, o]));

      const senderNotifications = await Notification.find({
        user: currentUserIdStr,
        title: { $regex: '🔑 Handover Code: ' }
      }).sort({ createdAt: -1 }).lean();

      const formattedExchanges = exchanges.map((e) => {
        const reqIdStr = (e.requester?._id || e.requester).toString();
        const ownerIdStr = (e.owner?._id || e.owner).toString();
        const reqProfile = profileMap.get(reqIdStr) || {};
        const ownerProfile = profileMap.get(ownerIdStr) || {};
        const activeOtp = otpMap.get(e._id.toString());

        let senderHandoverCode = null;
        if (activeOtp && activeOtp.sender.toString() === currentUserIdStr) {
          const matchedNotif = senderNotifications.find((n) => n.title.includes('🔑 Handover Code: '));
          if (matchedNotif) {
            const match = matchedNotif.title.match(/🔑 Handover Code: (\d{6})/);
            if (match) senderHandoverCode = match[1];
          }
        }

        return {
          id: e._id.toString(),
          requester_id: reqIdStr,
          requester_name: reqProfile.fullName || 'Student',
          owner_id: ownerIdStr,
          owner_name: ownerProfile.fullName || 'Student',
          offered_book: e.offeredBook ? {
            id: (e.offeredBook._id || e.offeredBook.id).toString(),
            title: e.offeredBook.title,
            author: e.offeredBook.author,
            department: e.offeredBook.department,
            semester: e.offeredBook.semester,
            location: e.offeredBook.location
          } : null,
          requested_book: e.requestedBook ? {
            id: (e.requestedBook._id || e.requestedBook.id).toString(),
            title: e.requestedBook.title,
            author: e.requestedBook.author,
            department: e.requestedBook.department,
            semester: e.requestedBook.semester,
            location: e.requestedBook.location
          } : null,
          match_level: e.matchLevel,
          match_reason: e.matchReason,
          status: e.status,
          meeting_spot: e.meetingSpot || '',
          proposed_date: e.proposedDate || '',
          start_time: e.proposedStartTime || '',
          end_time: e.proposedEndTime || '',
          proposed_by: e.proposedBy ? e.proposedBy.toString() : null,
          confirmed_by: e.scheduleConfirmedBy ? e.scheduleConfirmedBy.toString() : null,
          scheduled_at: e.scheduledAt,
          completed_at: e.completedAt,
          has_active_handover_otp: !!activeOtp,
          handover_code: senderHandoverCode,
          created_at: e.createdAt
        };
      });

      return res.json(formattedExchanges);
    } else {
      const store = getStore();
      const exchanges = (store.exchanges || []).filter((e) => {
        const reqStr = (e.requester || e.requester_id)?.toString();
        const ownStr = (e.owner || e.owner_id)?.toString();
        return reqStr === currentUserIdStr || ownStr === currentUserIdStr;
      });

      const profiles = store.userprofiles || [];
      const profileMap = new Map(profiles.map((p) => [p.user?.toString(), p]));

      const formattedExchanges = exchanges.map((e) => {
        const reqIdStr = (e.requester || e.requester_id)?.toString();
        const ownerIdStr = (e.owner || e.owner_id)?.toString();
        const reqProfile = profileMap.get(reqIdStr) || {};
        const ownerProfile = profileMap.get(ownerIdStr) || {};

        const offeredBook = (store.books || []).find((b) => (b.id || b._id)?.toString() === (e.offeredBook || e.offered_book_id)?.toString());
        const requestedBook = (store.books || []).find((b) => (b.id || b._id)?.toString() === (e.requestedBook || e.requested_book_id)?.toString());

        const otps = store.pickupverifications || [];
        const activeOtp = otps.find((o) => o.transaction_id === (e.id || e._id)?.toString() && !o.verified);
        let senderHandoverCode = activeOtp && activeOtp.sender_id === currentUserIdStr ? activeOtp.otp_code : null;

        return {
          id: (e.id || e._id).toString(),
          requester_id: reqIdStr,
          requester_name: reqProfile.fullName || 'Student',
          owner_id: ownerIdStr,
          owner_name: ownerProfile.fullName || 'Student',
          offered_book: offeredBook ? {
            id: (offeredBook.id || offeredBook._id).toString(),
            title: offeredBook.title,
            author: offeredBook.author,
            department: offeredBook.department,
            semester: offeredBook.semester,
            location: offeredBook.location
          } : null,
          requested_book: requestedBook ? {
            id: (requestedBook.id || requestedBook._id).toString(),
            title: requestedBook.title,
            author: requestedBook.author,
            department: requestedBook.department,
            semester: requestedBook.semester,
            location: requestedBook.location
          } : null,
          match_level: e.matchLevel || e.match_level,
          match_reason: e.matchReason || e.match_reason,
          status: e.status,
          meeting_spot: e.meetingSpot || e.meeting_spot || '',
          proposed_date: e.proposedDate || e.proposed_date || '',
          start_time: e.proposedStartTime || e.start_time || '',
          end_time: e.proposedEndTime || e.end_time || '',
          proposed_by: e.proposedBy || e.proposed_by || null,
          confirmed_by: e.scheduleConfirmedBy || e.confirmed_by || null,
          scheduled_at: e.scheduledAt || e.scheduled_at,
          completed_at: e.completedAt || e.completed_at,
          has_active_handover_otp: !!activeOtp,
          handover_code: senderHandoverCode,
          created_at: e.createdAt || e.created_at
        };
      });

      return res.json(formattedExchanges);
    }
  } catch (err) {
    console.error('Fetch my-exchanges error:', err);
    return res.status(500).json({ error: 'Failed to fetch exchange history.' });
  }
});

// 4. Accept Exchange Proposal (Recipient Only)
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const currentUserIdStr = req.user.id.toString();

    if (isMongoConnected) {
      const exchange = await Exchange.findById(exchangeId)
        .populate('offeredBook')
        .populate('requestedBook');

      if (!exchange) return res.status(404).json({ error: 'Exchange proposal not found.' });
      if (exchange.owner.toString() !== currentUserIdStr) {
        return res.status(403).json({ error: 'Unauthorized. Only the recipient can accept this exchange proposal.' });
      }
      if (exchange.status !== 'pending') {
        return res.status(400).json({ error: `Proposal cannot be accepted because status is "${exchange.status}".` });
      }

      exchange.status = 'accepted';
      await exchange.save();

      if (exchange.offeredBook) await Book.findByIdAndUpdate(exchange.offeredBook._id, { status: 'reserved' });
      if (exchange.requestedBook) await Book.findByIdAndUpdate(exchange.requestedBook._id, { status: 'reserved' });

      await createNotification({
        user: exchange.requester.toString(),
        type: 'exchange',
        title: '🎉 Exchange Proposal Accepted!',
        message: `${req.user.full_name || 'Student'} accepted your exchange proposal for "${exchange.requestedBook?.title || 'your book'}"!`,
        link: '/exchanges'
      });

      emitExchangeUpdate(exchange.requester.toString(), exchange.owner.toString(), { type: 'proposal_accepted', exchangeId: exchange._id.toString() });

      return res.json({
        success: true,
        message: 'Exchange proposal accepted successfully!',
        exchange_id: exchange._id.toString(),
        status: 'accepted'
      });
    } else {
      const store = getStore();
      const exchange = (store.exchanges || []).find((e) => (e.id || e._id).toString() === exchangeId);

      if (!exchange) return res.status(404).json({ error: 'Exchange proposal not found.' });
      const ownerIdStr = (exchange.owner || exchange.owner_id).toString();

      if (ownerIdStr !== currentUserIdStr) {
        return res.status(403).json({ error: 'Unauthorized. Only the recipient can accept this exchange proposal.' });
      }
      if (exchange.status !== 'pending') {
        return res.status(400).json({ error: `Proposal cannot be accepted because status is "${exchange.status}".` });
      }

      exchange.status = 'accepted';

      const offeredBook = (store.books || []).find((b) => (b.id || b._id).toString() === (exchange.offeredBook || exchange.offered_book_id).toString());
      const requestedBook = (store.books || []).find((b) => (b.id || b._id).toString() === (exchange.requestedBook || exchange.requested_book_id).toString());
      if (offeredBook) offeredBook.status = 'reserved';
      if (requestedBook) requestedBook.status = 'reserved';

      saveStore();

      const requesterIdStr = (exchange.requester || exchange.requester_id).toString();
      await createNotification({
        user: requesterIdStr,
        type: 'exchange',
        title: '🎉 Exchange Proposal Accepted!',
        message: `${req.user.full_name || 'Student'} accepted your exchange proposal for "${requestedBook?.title || 'your book'}"!`,
        link: '/exchanges'
      });

      emitExchangeUpdate(requesterIdStr, ownerIdStr, { type: 'proposal_accepted', exchangeId });

      return res.json({
        success: true,
        message: 'Exchange proposal accepted successfully!',
        exchange_id: exchangeId,
        status: 'accepted'
      });
    }
  } catch (err) {
    console.error('Accept exchange error:', err);
    return res.status(500).json({ error: 'Failed to accept exchange proposal.' });
  }
});

// 5. Reject Exchange Proposal (Recipient Only)
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const currentUserIdStr = req.user.id.toString();

    if (isMongoConnected) {
      const exchange = await Exchange.findById(exchangeId);
      if (!exchange) return res.status(404).json({ error: 'Exchange proposal not found.' });
      if (exchange.owner.toString() !== currentUserIdStr) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }

      exchange.status = 'rejected';
      await exchange.save();

      await createNotification({
        user: exchange.requester.toString(),
        type: 'exchange',
        title: 'Exchange Proposal Declined',
        message: `${req.user.full_name || 'Student'} declined the exchange proposal.`,
        link: '/exchanges'
      });

      emitExchangeUpdate(exchange.requester.toString(), exchange.owner.toString(), { type: 'proposal_rejected', exchangeId: exchange._id.toString() });

      return res.json({ success: true, message: 'Exchange proposal declined.' });
    } else {
      const store = getStore();
      const exchange = (store.exchanges || []).find((e) => (e.id || e._id).toString() === exchangeId);
      if (!exchange) return res.status(404).json({ error: 'Exchange proposal not found.' });
      const ownerIdStr = (exchange.owner || exchange.owner_id).toString();

      if (ownerIdStr !== currentUserIdStr) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }

      exchange.status = 'rejected';
      saveStore();

      const requesterIdStr = (exchange.requester || exchange.requester_id).toString();
      await createNotification({
        user: requesterIdStr,
        type: 'exchange',
        title: 'Exchange Proposal Declined',
        message: `${req.user.full_name || 'Student'} declined the exchange proposal.`,
        link: '/exchanges'
      });

      emitExchangeUpdate(requesterIdStr, ownerIdStr, { type: 'proposal_rejected', exchangeId });

      return res.json({ success: true, message: 'Exchange proposal declined.' });
    }
  } catch (err) {
    console.error('Reject exchange error:', err);
    return res.status(500).json({ error: 'Failed to reject proposal.' });
  }
});

// 6. Propose Meeting Schedule for Exchange
router.post('/:id/propose-schedule', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const { meeting_spot, proposed_date, start_time, end_time } = req.body;
    const currentUserIdStr = req.user.id.toString();

    if (!meeting_spot || !proposed_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'Please provide meeting spot, date, start time, and end time.'
      });
    }

    let exchange = null;
    let requesterIdStr = '';
    let ownerIdStr = '';

    if (isMongoConnected) {
      exchange = await Exchange.findById(exchangeId);
      if (!exchange) return res.status(404).json({ success: false, error: 'Exchange proposal not found.' });

      requesterIdStr = (exchange.requester?._id || exchange.requester).toString();
      ownerIdStr = (exchange.owner?._id || exchange.owner).toString();

      if (currentUserIdStr !== requesterIdStr && currentUserIdStr !== ownerIdStr) {
        return res.status(403).json({ success: false, error: 'Unauthorized. Only participants can schedule a meeting.' });
      }

      if (!['accepted', 'scheduled', 'handover_pending'].includes(exchange.status)) {
        return res.status(400).json({ success: false, error: `Cannot schedule meeting for exchange with status "${exchange.status}".` });
      }

      exchange.meetingSpot = meeting_spot;
      exchange.proposedDate = proposed_date;
      exchange.proposedStartTime = start_time;
      exchange.proposedEndTime = end_time;
      exchange.proposedBy = currentUserIdStr;
      exchange.scheduleConfirmedBy = null;

      await exchange.save();
    } else {
      const store = getStore();
      exchange = (store.exchanges || []).find((e) => (e.id || e._id).toString() === exchangeId);
      if (!exchange) return res.status(404).json({ success: false, error: 'Exchange proposal not found.' });

      requesterIdStr = (exchange.requester || exchange.requester_id).toString();
      ownerIdStr = (exchange.owner || exchange.owner_id).toString();

      if (currentUserIdStr !== requesterIdStr && currentUserIdStr !== ownerIdStr) {
        return res.status(403).json({ success: false, error: 'Unauthorized. Only participants can schedule a meeting.' });
      }

      if (!['accepted', 'scheduled', 'handover_pending'].includes(exchange.status)) {
        return res.status(400).json({ success: false, error: `Cannot schedule meeting for exchange with status "${exchange.status}".` });
      }

      exchange.meetingSpot = meeting_spot;
      exchange.meeting_spot = meeting_spot;
      exchange.proposedDate = proposed_date;
      exchange.proposed_date = proposed_date;
      exchange.proposedStartTime = start_time;
      exchange.start_time = start_time;
      exchange.proposedEndTime = end_time;
      exchange.end_time = end_time;
      exchange.proposedBy = currentUserIdStr;
      exchange.proposed_by = currentUserIdStr;
      exchange.scheduleConfirmedBy = null;
      exchange.confirmed_by = null;

      saveStore();
    }

    const peerIdStr = currentUserIdStr === requesterIdStr ? ownerIdStr : requesterIdStr;
    const proposerName = req.user.full_name || 'Your exchange partner';

    await createNotification({
      user: peerIdStr,
      type: 'exchange',
      title: '📅 Meeting Schedule Proposed',
      message: `${proposerName} proposed a meeting at ${meeting_spot} on ${proposed_date} from ${start_time} to ${end_time}.`,
      link: '/exchanges'
    });

    emitExchangeUpdate(requesterIdStr, ownerIdStr, { type: 'schedule_proposed', exchangeId });

    return res.json({
      success: true,
      message: 'Meeting schedule proposed successfully.',
      exchange
    });
  } catch (err) {
    console.error('Propose exchange schedule error:', err);
    return res.status(500).json({ success: false, error: 'Unable to propose the meeting schedule. Please try again.' });
  }
});

// 7. Confirm Meeting Schedule for Exchange
router.post('/:id/confirm-schedule', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const currentUserIdStr = req.user.id.toString();

    let exchange = null;
    let requesterIdStr = '';
    let ownerIdStr = '';

    if (isMongoConnected) {
      exchange = await Exchange.findById(exchangeId);
      if (!exchange) return res.status(404).json({ success: false, error: 'Exchange proposal not found.' });

      requesterIdStr = (exchange.requester?._id || exchange.requester).toString();
      ownerIdStr = (exchange.owner?._id || exchange.owner).toString();

      if (currentUserIdStr !== requesterIdStr && currentUserIdStr !== ownerIdStr) {
        return res.status(403).json({ success: false, error: 'Unauthorized. Only participants can confirm meeting schedule.' });
      }

      if (exchange.proposedBy && exchange.proposedBy.toString() === currentUserIdStr) {
        return res.status(400).json({ success: false, error: 'You cannot confirm a schedule you proposed yourself. Peer student must agree.' });
      }

      if (!['accepted', 'scheduled', 'handover_pending'].includes(exchange.status)) {
        return res.status(400).json({ success: false, error: `Cannot confirm schedule for exchange with status "${exchange.status}".` });
      }

      exchange.status = 'handover_pending';
      exchange.scheduleConfirmedBy = currentUserIdStr;
      exchange.scheduledAt = new Date();

      await exchange.save();
    } else {
      const store = getStore();
      exchange = (store.exchanges || []).find((e) => (e.id || e._id).toString() === exchangeId);
      if (!exchange) return res.status(404).json({ success: false, error: 'Exchange proposal not found.' });

      requesterIdStr = (exchange.requester || exchange.requester_id).toString();
      ownerIdStr = (exchange.owner || exchange.owner_id).toString();

      if (currentUserIdStr !== requesterIdStr && currentUserIdStr !== ownerIdStr) {
        return res.status(403).json({ success: false, error: 'Unauthorized. Only participants can confirm meeting schedule.' });
      }

      const proposedByStr = (exchange.proposedBy || exchange.proposed_by || '').toString();
      if (proposedByStr === currentUserIdStr) {
        return res.status(400).json({ success: false, error: 'You cannot confirm a schedule you proposed yourself. Peer student must agree.' });
      }

      exchange.status = 'handover_pending';
      exchange.scheduleConfirmedBy = currentUserIdStr;
      exchange.confirmed_by = currentUserIdStr;
      exchange.scheduledAt = new Date().toISOString();
      exchange.scheduled_at = new Date().toISOString();

      saveStore();
    }

    const meetingSpot = exchange.meetingSpot || exchange.meeting_spot || 'Campus grounds';
    const proposedDate = exchange.proposedDate || exchange.proposed_date || 'Today';

    const rawOtp = await autoGenerateHandoverCode({
      transactionId: exchangeId,
      transactionType: 'exchange',
      senderId: ownerIdStr,
      receiverId: requesterIdStr,
      meetingSpot,
      proposedDate
    });

    const peerIdStr = currentUserIdStr === requesterIdStr ? ownerIdStr : requesterIdStr;
    await createNotification({
      user: peerIdStr,
      type: 'exchange',
      title: '✅ Meeting Schedule Confirmed!',
      message: `${req.user.full_name || 'Student'} confirmed the proposed meeting schedule.`,
      link: '/exchanges'
    });

    emitExchangeUpdate(requesterIdStr, ownerIdStr, { type: 'schedule_confirmed', exchangeId });

    return res.json({
      success: true,
      message: 'Meeting schedule confirmed successfully.',
      exchange
    });
  } catch (err) {
    console.error('Confirm exchange schedule error:', err);
    return res.status(500).json({ success: false, error: 'Failed to confirm meeting schedule.' });
  }
});

// 8. Verify Physical Handover OTP Code (Exchange Participants)
router.post('/:id/verify-handover-otp', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const { otp } = req.body;
    const currentUserIdStr = req.user.id.toString();

    console.log(`[SECURITY LOG] Handover code verification requested for Exchange ID: ${exchangeId} by user: ${currentUserIdStr}`);

    if (!otp || !/^\d{6}$/.test(otp.toString().trim())) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Invalid OTP format`);
      return res.status(400).json({
        success: false,
        message: 'Invalid handover code format. Must be exactly 6 digits.'
      });
    }

    let exchange = null;
    let requesterIdStr = '';
    let ownerIdStr = '';

    if (isMongoConnected) {
      exchange = await findExchangeById(exchangeId);
      if (!exchange) return res.status(404).json({ success: false, message: 'Exchange proposal not found.' });

      requesterIdStr = (exchange.requester?._id || exchange.requester).toString();
      ownerIdStr = (exchange.owner?._id || exchange.owner).toString();

      if (currentUserIdStr !== requesterIdStr && currentUserIdStr !== ownerIdStr) {
        return res.status(403).json({ success: false, message: 'Unauthorized. Only participants involved in the exchange can verify handover.' });
      }

      if (exchange.status === 'completed') {
        return res.status(400).json({ success: false, message: 'This exchange transaction has already been completed.' });
      }

      if (exchange.status === 'cancelled' || exchange.status === 'rejected') {
        return res.status(400).json({ success: false, message: `Cannot verify handover code for exchange with status "${exchange.status}".` });
      }

      const otpRecord = await HandoverOtp.findOne({
        transactionId: exchangeId.toString(),
        purpose: 'HANDOVER_COMPLETION'
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'Handover code not found. Please confirm the meeting schedule first.'
        });
      }

      if (otpRecord.sender && otpRecord.sender.toString() === currentUserIdStr) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. The seller cannot complete the transaction alone. The recipient must enter the handover code.'
        });
      }

      if (otpRecord.receiver && otpRecord.receiver.toString() !== currentUserIdStr) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. Only the recipient can submit the handover code.'
        });
      }

      if (otpRecord.verified) {
        return res.status(400).json({
          success: false,
          message: 'Handover code has already been used.'
        });
      }

      if (otpRecord.expiresAt && new Date() > new Date(otpRecord.expiresAt)) {
        return res.status(400).json({
          success: false,
          message: 'Handover code has expired.'
        });
      }

      if (otpRecord.attempts >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Too many failed verification attempts. Please generate a new schedule code.'
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
        return res.status(400).json({
          success: false,
          message: 'Invalid handover code.'
        });
      }

      otpRecord.verified = true;
      await otpRecord.save();

      exchange.status = 'completed';
      exchange.completedAt = new Date();
      await exchange.save();

      if (exchange.offeredBook) {
        const offBookId = (exchange.offeredBook._id || exchange.offeredBook).toString();
        if (mongoose.Types.ObjectId.isValid(offBookId)) {
          await Book.findByIdAndUpdate(offBookId, { status: 'sold' });
        } else {
          await Book.findOneAndUpdate({ $or: [{ _id: offBookId }, { id: offBookId }] }, { status: 'sold' });
        }
      }

      if (exchange.requestedBook) {
        const reqBookId = (exchange.requestedBook._id || exchange.requestedBook).toString();
        if (mongoose.Types.ObjectId.isValid(reqBookId)) {
          await Book.findByIdAndUpdate(reqBookId, { status: 'sold' });
        } else {
          await Book.findOneAndUpdate({ $or: [{ _id: reqBookId }, { id: reqBookId }] }, { status: 'sold' });
        }
      }

      try {
        await EcoPoint.create({ user: ownerIdStr, points: 30, action: 'reuse', description: 'Earned +30 Eco Points for completed book exchange' });
        await EcoPoint.create({ user: requesterIdStr, points: 30, action: 'reuse', description: 'Earned +30 Eco Points for completed book exchange' });
        await UserProfile.findOneAndUpdate({ user: ownerIdStr }, { $inc: { ecoPoints: 30 } });
        await UserProfile.findOneAndUpdate({ user: requesterIdStr }, { $inc: { ecoPoints: 30 } });
      } catch (e) {}
    } else {
      const store = getStore();
      exchange = (store.exchanges || []).find((e) => (e.id || e._id).toString() === exchangeId.toString());
      if (!exchange) return res.status(404).json({ success: false, message: 'Exchange proposal not found.' });

      requesterIdStr = (exchange.requester || exchange.requester_id).toString();
      ownerIdStr = (exchange.owner || exchange.owner_id).toString();

      if (currentUserIdStr !== requesterIdStr && currentUserIdStr !== ownerIdStr) {
        return res.status(403).json({ success: false, message: 'Unauthorized. Only participants involved in the exchange can verify handover.' });
      }

      if (exchange.status === 'completed') {
        return res.status(400).json({ success: false, message: 'This exchange transaction has already been completed.' });
      }

      if (exchange.status === 'cancelled' || exchange.status === 'rejected') {
        return res.status(400).json({ success: false, message: `Cannot verify handover code for exchange with status "${exchange.status}".` });
      }

      const otpRecord = (store.pickupverifications || [])
        .filter((v) => (v.transaction_id || v.transactionId)?.toString() === exchangeId.toString())
        .reverse()[0];

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'Handover code not found. Please confirm the meeting schedule first.'
        });
      }

      const senderIdStr = (otpRecord.sender_id || otpRecord.sender || '').toString();
      const receiverIdStr = (otpRecord.receiver_id || otpRecord.receiver || '').toString();

      if (senderIdStr && senderIdStr === currentUserIdStr) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. The seller cannot complete the transaction alone. The recipient must enter the handover code.'
        });
      }

      if (receiverIdStr && receiverIdStr !== currentUserIdStr) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. Only the recipient can submit the handover code.'
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
          message: 'Too many failed verification attempts. Please generate a new schedule code.'
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

      exchange.status = 'completed';
      exchange.completedAt = new Date().toISOString();
      exchange.completed_at = new Date().toISOString();

      const offeredBook = (store.books || []).find((b) => (b.id || b._id).toString() === (exchange.offeredBook || exchange.offered_book_id).toString());
      const requestedBook = (store.books || []).find((b) => (b.id || b._id).toString() === (exchange.requestedBook || exchange.requested_book_id).toString());
      if (offeredBook) offeredBook.status = 'sold';
      if (requestedBook) requestedBook.status = 'sold';

      saveStore();
    }

    const peerIdStr = currentUserIdStr === requesterIdStr ? ownerIdStr : requesterIdStr;
    await createNotification({
      user: peerIdStr,
      type: 'exchange',
      title: '✅ Handover Completed!',
      message: 'The physical handover for your book exchange has been successfully verified.',
      link: `/exchanges?exchangeId=${exchangeId}`
    });

    emitExchangeUpdate(requesterIdStr, ownerIdStr, { type: 'exchange_completed', exchangeId });

    return res.json({
      success: true,
      message: 'Physical handover verified successfully.',
      status: 'completed',
      exchange_id: exchangeId
    });
  } catch (err) {
    console.error('Verify exchange handover OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify handover code.' });
  }
});

export default router;

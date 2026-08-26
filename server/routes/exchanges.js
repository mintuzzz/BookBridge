import express from 'express';
import bcrypt from 'bcryptjs';
import Exchange from '../models/Exchange.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import Notification from '../models/Notification.js';
import EcoPoint from '../models/EcoPoint.js';
import ExchangeMessage from '../models/ExchangeMessage.js';
import HandoverOtp from '../models/HandoverOtp.js';
import { isMongoConnected } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { emitNotification, emitExchangeUpdate, emitMessageUpdate } from '../socket.js';

const router = express.Router();

// Helper: Automatically generate handover code on backend
async function autoGenerateHandoverCode({ transactionId, transactionType, senderId, receiverId, meetingSpot, proposedDate }) {
  await HandoverOtp.updateMany(
    { transactionId: transactionId.toString(), purpose: 'HANDOVER_COMPLETION', verified: false },
    { verified: true }
  );

  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(rawOtp, 10);

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

  // SAFE SERVER LOG (NEVER LOG ACTUAL OTP)
  console.log(`[SECURITY LOG] Handover completion code automatically generated for ${transactionType} transaction: ${transactionId}`);

  // Notify Sender with Code
  if (isMongoConnected) {
    try {
      const senderNotif = await Notification.create({
        user: senderId,
        title: `🔑 Handover Code: ${rawOtp}`,
        message: `Share this 6-digit code with the recipient after handing over the book at ${meetingSpot || 'meeting'}.`,
        type: 'exchange',
        link: '/exchanges'
      });
      emitNotification(senderId, senderNotif);

      // Notify Receiver WITHOUT Code
      const receiverNotif = await Notification.create({
        user: receiverId,
        title: '🔑 Handover Scheduled',
        message: `Meeting scheduled on ${proposedDate || 'today'} at ${meetingSpot || 'campus spot'}. Get the 6-digit handover code from book provider at handover!`,
        type: 'exchange',
        link: '/exchanges'
      });
      emitNotification(receiverId, receiverNotif);
    } catch (e) {}
  }

  return rawOtp;
}

// 1. Get Intelligent Exchange Matches for Current User
router.get('/matches', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const myExchangeBooks = await Book.find({
      seller: userId,
      transactionType: 'exchange',
      status: 'available'
    }).lean();

    const otherExchangeBooks = await Book.find({
      seller: { $ne: userId },
      transactionType: 'exchange',
      status: 'available'
    })
      .populate('seller', 'email phone')
      .lean();

    const otherSellerIds = otherExchangeBooks.map((b) => b.seller?._id || b.seller);
    const profiles = await UserProfile.find({ user: { $in: otherSellerIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const matches = [];

    for (const myBook of myExchangeBooks) {
      for (const otherBook of otherExchangeBooks) {
        const sellerIdStr = (otherBook.seller?._id || otherBook.seller).toString();
        const p = profileMap.get(sellerIdStr) || {};

        let matchLevel = 'possible';
        let matchReason = `Related subject match in ${otherBook.department}.`;

        const myWanted = (myBook.wantedBookTitle || '').trim().toLowerCase();
        const otherWanted = (otherBook.wantedBookTitle || '').trim().toLowerCase();
        const myTitle = (myBook.title || '').trim().toLowerCase();
        const otherTitle = (otherBook.title || '').trim().toLowerCase();

        const isMyWantedMatch = myWanted.length > 2 && (otherTitle.includes(myWanted) || myWanted.includes(otherTitle));
        const isOtherWantedMatch = otherWanted.length > 2 && (myTitle.includes(otherWanted) || otherWanted.includes(myTitle));
        const isMutualTitleMatch = isMyWantedMatch && isOtherWantedMatch;
        const isPartialMutualMatch = isMyWantedMatch || isOtherWantedMatch;

        const isSameDept = myBook.department === otherBook.department;
        const isSameSubject = myBook.subject.toLowerCase() === otherBook.subject.toLowerCase();

        if (isMutualTitleMatch && isSameDept) {
          matchLevel = 'perfect';
          matchReason = `🎉 100% Perfect Reciprocal Exchange! Both of your requested book titles directly match each other's listings in ${myBook.department}.`;
        } else if (isPartialMutualMatch || (isSameSubject && isSameDept)) {
          matchLevel = 'strong';
          matchReason = `⭐ Strong Department & Title Alignment: Compatible for ${myBook.department} Semester ${myBook.semester} swap.`;
        }

        matches.push({
          id: `MATCH-${myBook._id}-${otherBook._id}`,
          my_book: {
            id: myBook._id.toString(),
            ...myBook
          },
          target_book: {
            id: otherBook._id.toString(),
            owner_name: p.fullName || 'Verified Student',
            owner_rating: p.rating || 4.8,
            owner_avatar: p.avatarUrl || '',
            owner_dept: p.department || 'Computer Science',
            ...otherBook
          },
          match_level: matchLevel,
          match_reason: matchReason
        });
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
    const senderId = req.user.id.toString();

    if (!offered_book_id || !requested_book_id) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both offered_book_id and requested_book_id.'
      });
    }

    const requestedBook = await Book.findById(requested_book_id);
    const offeredBook = await Book.findById(offered_book_id);

    if (!requestedBook || !offeredBook) {
      return res.status(404).json({
        success: false,
        error: 'One or both books not found.'
      });
    }

    const recipientId = requestedBook.seller.toString();

    // 1. Self Proposal Check
    if (recipientId === senderId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot send an exchange proposal to yourself.'
      });
    }

    if (offeredBook.seller.toString() !== senderId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. You can only offer books that belong to your account.'
      });
    }

    // 2. Listing Availability Check
    if (requestedBook.status !== 'available' || offeredBook.status !== 'available') {
      return res.status(400).json({
        success: false,
        error: 'One or both book listings are no longer available for exchange.'
      });
    }

    // 3. Duplicate Active Proposal Check
    const existingProposal = await Exchange.findOne({
      $or: [
        { requester: senderId, owner: recipientId, offeredBook: offered_book_id, requestedBook: requested_book_id },
        { requester: recipientId, owner: senderId, offeredBook: requested_book_id, requestedBook: offered_book_id }
      ],
      status: { $in: ['pending', 'accepted', 'scheduled', 'handover_pending'] }
    });

    if (existingProposal) {
      return res.status(400).json({
        success: false,
        error: 'An active exchange proposal already exists for these books.'
      });
    }

    // 4. Create MongoDB Proposal
    const newExchange = await Exchange.create({
      requester: senderId,
      owner: recipientId,
      offeredBook: offered_book_id,
      requestedBook: requested_book_id,
      matchLevel: match_level || 'strong',
      matchReason: match_reason || 'Direct exchange request sent by student.',
      status: 'pending'
    });

    // 5. Notification Creation (Safe Try/Catch so notification failures do not invalidate proposal)
    try {
      const notif = await Notification.create({
        user: recipientId,
        title: '🔄 New Exchange Request!',
        message: `${req.user.full_name || 'A student'} wants to exchange "${offeredBook.title}" for your "${requestedBook.title}".`,
        type: 'exchange',
        link: '/exchanges'
      });

      // REAL-TIME PUSH
      emitNotification(recipientId, notif);
      emitExchangeUpdate(senderId, recipientId, { type: 'proposal_sent', exchangeId: newExchange._id.toString() });
    } catch (notifErr) {
      console.warn('⚠️ Notification emission warning:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Exchange proposal sent successfully.',
      proposal: {
        id: newExchange._id.toString(),
        status: 'pending',
        requester_id: senderId,
        owner_id: recipientId
      },
      exchange_id: newExchange._id.toString()
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
    const currentUserId = req.user.id.toString();

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
      user: currentUserId,
      title: { $regex: '🔑 Handover Code: ' }
    }).sort({ createdAt: -1 }).lean();

    const formattedExchanges = exchanges.map((e) => {
      const reqIdStr = (e.requester?._id || e.requester).toString();
      const ownerIdStr = (e.owner?._id || e.owner).toString();
      const reqProfile = profileMap.get(reqIdStr) || {};
      const ownerProfile = profileMap.get(ownerIdStr) || {};
      const activeOtp = otpMap.get(e._id.toString());

      let senderHandoverCode = null;
      if (activeOtp && activeOtp.sender.toString() === currentUserId) {
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
        requester_email: reqProfile.email || '',
        owner_id: ownerIdStr,
        owner_name: ownerProfile.fullName || 'Student',
        owner_email: ownerProfile.email || '',
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
  } catch (err) {
    console.error('Fetch my-exchanges error:', err);
    return res.status(500).json({ error: 'Failed to fetch exchange history.' });
  }
});

// 4. Accept Exchange Proposal (Recipient Only)
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const exchange = await Exchange.findById(exchangeId)
      .populate('offeredBook')
      .populate('requestedBook');

    if (!exchange) {
      return res.status(404).json({ error: 'Exchange proposal not found.' });
    }

    const currentUserId = req.user.id.toString();
    const recipientId = exchange.owner.toString();

    if (recipientId !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized. Only the recipient can accept this exchange proposal.' });
    }

    if (exchange.status !== 'pending') {
      return res.status(400).json({ error: `Proposal cannot be accepted because status is "${exchange.status}".` });
    }

    exchange.status = 'accepted';
    await exchange.save();

    if (exchange.offeredBook) {
      await Book.findByIdAndUpdate(exchange.offeredBook._id, { status: 'reserved' });
    }
    if (exchange.requestedBook) {
      await Book.findByIdAndUpdate(exchange.requestedBook._id, { status: 'reserved' });
    }

    if (isMongoConnected) {
      try {
        await EcoPoint.create({
          user: currentUserId,
          points: 15,
          action: 'exchange',
          description: `Accepted exchange proposal for "${exchange.requestedBook?.title || 'Book'}"`
        });
        await UserProfile.findOneAndUpdate({ user: currentUserId }, { $inc: { ecoPoints: 15 } });

        const notif = await Notification.create({
          user: exchange.requester,
          title: '🎉 Exchange Proposal Accepted!',
          message: `${req.user.full_name || 'Student'} accepted your exchange proposal for "${exchange.requestedBook?.title || 'your book'}"!`,
          type: 'exchange',
          link: '/exchanges'
        });

        // REAL-TIME PUSH
        emitNotification(exchange.requester, notif);
        emitExchangeUpdate(exchange.requester, exchange.owner, { type: 'proposal_accepted', exchangeId: exchange._id.toString() });
      } catch (ecoErr) {
        console.warn('Notification/EcoPoints warning:', ecoErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Exchange proposal accepted successfully!',
      exchange_id: exchange._id.toString(),
      status: 'accepted'
    });
  } catch (err) {
    console.error('Accept exchange error:', err);
    return res.status(500).json({ error: 'Failed to accept exchange proposal.' });
  }
});

// 5. Reject Exchange Proposal (Recipient Only)
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const exchange = await Exchange.findById(exchangeId)
      .populate('offeredBook')
      .populate('requestedBook');

    if (!exchange) {
      return res.status(404).json({ error: 'Exchange proposal not found.' });
    }

    const currentUserId = req.user.id.toString();
    const recipientId = exchange.owner.toString();

    if (recipientId !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized. Only the recipient can decline this exchange proposal.' });
    }

    if (exchange.status !== 'pending') {
      return res.status(400).json({ error: `Proposal cannot be rejected because status is "${exchange.status}".` });
    }

    exchange.status = 'rejected';
    await exchange.save();

    if (isMongoConnected) {
      try {
        const notif = await Notification.create({
          user: exchange.requester,
          title: '❌ Exchange Proposal Declined',
          message: `${req.user.full_name || 'Student'} declined your exchange proposal for "${exchange.requestedBook?.title || 'the book'}".`,
          type: 'exchange',
          link: '/exchanges'
        });

        // REAL-TIME PUSH
        emitNotification(exchange.requester, notif);
        emitExchangeUpdate(exchange.requester, exchange.owner, { type: 'proposal_rejected', exchangeId: exchange._id.toString() });
      } catch (notifErr) {
        console.warn('Notification warning:', notifErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Exchange proposal declined.',
      exchange_id: exchange._id.toString(),
      status: 'rejected'
    });
  } catch (err) {
    console.error('Reject exchange error:', err);
    return res.status(500).json({ error: 'Failed to decline exchange proposal.' });
  }
});

// 6. Propose Schedule (Date, Time, Spot) - Participants Only
router.post('/:id/propose-schedule', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const { meeting_spot, proposed_date, start_time, end_time } = req.body;

    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange proposal not found.' });
    }

    const currentUserId = req.user.id.toString();
    const requesterId = exchange.requester.toString();
    const ownerId = exchange.owner.toString();

    if (currentUserId !== requesterId && currentUserId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized. Only exchange participants can schedule this exchange.' });
    }

    if (exchange.status !== 'accepted' && exchange.status !== 'scheduled' && exchange.status !== 'handover_pending') {
      return res.status(400).json({ error: `Cannot schedule exchange with status "${exchange.status}".` });
    }

    if (!meeting_spot || !proposed_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Please provide meeting spot, date, start time, and end time.' });
    }

    exchange.meetingSpot = meeting_spot;
    exchange.proposedDate = proposed_date;
    exchange.proposedStartTime = start_time;
    exchange.proposedEndTime = end_time;
    exchange.proposedBy = currentUserId;
    exchange.scheduleConfirmedBy = null;

    await exchange.save();

    const peerId = currentUserId === requesterId ? exchange.owner : exchange.requester;
    if (isMongoConnected) {
      try {
        const notif = await Notification.create({
          user: peerId,
          title: '📅 Exchange Schedule Proposed',
          message: `${req.user.full_name || 'Student'} proposed meeting on ${proposed_date} (${start_time} - ${end_time}) at ${meeting_spot}.`,
          type: 'exchange',
          link: '/exchanges'
        });

        // REAL-TIME PUSH
        emitNotification(peerId, notif);
        emitExchangeUpdate(requesterId, ownerId, { type: 'schedule_proposed', exchangeId: exchange._id.toString() });
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: 'Schedule proposal submitted! Waiting for peer confirmation.',
      exchange
    });
  } catch (err) {
    console.error('Propose schedule error:', err);
    return res.status(500).json({ error: 'Failed to submit schedule proposal.' });
  }
});

// 7. Confirm Schedule & AUTOMATICALLY GENERATE HANDOVER COMPLETION CODE
router.post('/:id/confirm-schedule', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange proposal not found.' });
    }

    const currentUserId = req.user.id.toString();
    const requesterId = exchange.requester.toString();
    const ownerId = exchange.owner.toString();

    if (currentUserId !== requesterId && currentUserId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized. Only exchange participants can confirm the schedule.' });
    }

    if (exchange.proposedBy && exchange.proposedBy.toString() === currentUserId) {
      return res.status(400).json({ error: 'You cannot confirm a schedule you proposed yourself. Peer student must agree.' });
    }

    if (exchange.status !== 'accepted' && exchange.status !== 'scheduled' && exchange.status !== 'handover_pending') {
      return res.status(400).json({ error: `Cannot confirm schedule for exchange with status "${exchange.status}".` });
    }

    exchange.status = 'handover_pending';
    exchange.scheduleConfirmedBy = currentUserId;
    exchange.scheduledAt = new Date();

    await exchange.save();

    // AUTOMATIC HANDOVER CODE GENERATION ON BACKEND
    const senderId = exchange.owner.toString();
    const receiverId = exchange.requester.toString();
    const rawOtp = await autoGenerateHandoverCode({
      transactionId: exchange._id,
      transactionType: 'exchange',
      senderId,
      receiverId,
      meetingSpot: exchange.meetingSpot,
      proposedDate: exchange.proposedDate
    });

    // REAL-TIME PUSH
    emitExchangeUpdate(requesterId, ownerId, { type: 'schedule_confirmed', exchangeId: exchange._id.toString() });

    return res.json({
      success: true,
      message: 'Exchange schedule agreed! Handover completion code automatically generated on backend.',
      exchange,
      handover_code: currentUserId === senderId ? rawOtp : undefined
    });
  } catch (err) {
    console.error('Confirm schedule error:', err);
    return res.status(500).json({ error: 'Failed to confirm exchange schedule.' });
  }
});

// 8. Verify Handover Completion OTP (Receiver / Recipient ONLY)
router.post('/:id/verify-handover-otp', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const { otp } = req.body;
    const currentUserId = req.user.id.toString();

    console.log(`[SECURITY LOG] Handover code verification requested for Exchange ID: ${exchangeId} by user: ${currentUserId}`);

    if (!otp || !/^\d{6}$/.test(otp.toString().trim())) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Invalid OTP format`);
      return res.status(400).json({
        success: false,
        message: 'Invalid handover code format. Must be exactly 6 digits.'
      });
    }

    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ success: false, message: 'Exchange proposal not found.' });
    }

    if (exchange.status === 'completed') {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Already completed`);
      return res.status(400).json({ success: false, message: 'This transaction has already been completed.' });
    }

    if (exchange.status === 'cancelled' || exchange.status === 'rejected') {
      return res.status(400).json({ success: false, message: `Cannot verify completion code for exchange with status "${exchange.status}".` });
    }

    const otpRecord = await HandoverOtp.findOne({
      transactionId: exchangeId,
      purpose: 'HANDOVER_COMPLETION'
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: OTP record not found`);
      return res.status(400).json({
        success: false,
        message: 'Handover code not found. Please request a new code.'
      });
    }

    if (otpRecord.sender.toString() === currentUserId) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Sender self-verification blocked`);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. The book provider cannot complete the transaction alone. The receiving student must enter the handover code.'
      });
    }

    if (otpRecord.receiver.toString() !== currentUserId) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Unauthorized third-party user`);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only the exchange recipient can submit the handover code.'
      });
    }

    if (otpRecord.verified) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Reused OTP`);
      return res.status(400).json({
        success: false,
        message: 'Handover code has already been used.'
      });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Expired OTP`);
      return res.status(400).json({
        success: false,
        message: 'Handover code has expired.'
      });
    }

    if (otpRecord.attempts >= 5) {
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Max 5 attempts exceeded`);
      return res.status(400).json({
        success: false,
        message: 'Too many verification attempts. Please request a new code.'
      });
    }

    const isMatch = await bcrypt.compare(otp.toString().trim(), otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      console.log(`[SECURITY LOG] Handover code verification FAILED for Exchange ID: ${exchangeId}. Reason: Hash mismatch (Wrong code)`);
      return res.status(400).json({
        success: false,
        message: 'Invalid handover code.'
      });
    }

    console.log(`[SECURITY LOG] Handover code verification SUCCESS for Exchange ID: ${exchangeId}`);

    otpRecord.verified = true;
    await otpRecord.save();

    exchange.status = 'completed';
    exchange.completedAt = new Date();
    await exchange.save();

    if (exchange.offeredBook) {
      await Book.findByIdAndUpdate(exchange.offeredBook, { status: 'sold' });
    }
    if (exchange.requestedBook) {
      await Book.findByIdAndUpdate(exchange.requestedBook, { status: 'sold' });
    }

    if (isMongoConnected) {
      try {
        await EcoPoint.create({ user: exchange.requester, points: 20, action: 'exchange', description: 'Earned +20 Eco Points for completed exchange' });
        await EcoPoint.create({ user: exchange.owner, points: 20, action: 'exchange', description: 'Earned +20 Eco Points for completed exchange' });
        await UserProfile.findOneAndUpdate({ user: exchange.requester }, { $inc: { ecoPoints: 20 } });
        await UserProfile.findOneAndUpdate({ user: exchange.owner }, { $inc: { ecoPoints: 20 } });

        const notif = await Notification.create({
          user: otpRecord.sender,
          title: '🎉 Handover Verified!',
          message: 'The recipient verified the handover code! Your book exchange is now completed.',
          type: 'exchange',
          link: '/exchanges'
        });

        // REAL-TIME PUSH
        emitNotification(otpRecord.sender, notif);
        emitExchangeUpdate(exchange.requester, exchange.owner, { type: 'exchange_completed', exchangeId: exchange._id.toString() });
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: '🎉 Handover code verified cleanly! Exchange completed.',
      status: 'completed'
    });
  } catch (err) {
    console.error('Verify handover OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify handover code.' });
  }
});

// 9. Mark Exchange as Completed (Guarded by Handover OTP Verification)
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange proposal not found.' });
    }

    if (exchange.status !== 'completed') {
      return res.status(400).json({ error: 'Handover verification code required. Complete the 6-digit code verification at physical meeting.' });
    }

    return res.json({
      success: true,
      message: 'Exchange completed successfully!',
      status: 'completed'
    });
  } catch (err) {
    console.error('Complete exchange error:', err);
    return res.status(500).json({ error: 'Failed to complete exchange.' });
  }
});

// 10. Send Exchange Message (Participants Only)
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange proposal not found.' });
    }

    const currentUserId = req.user.id.toString();
    const requesterId = exchange.requester.toString();
    const ownerId = exchange.owner.toString();

    if (currentUserId !== requesterId && currentUserId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized. Only exchange participants can send messages for this exchange.' });
    }

    const receiverId = currentUserId === requesterId ? exchange.owner : exchange.requester;

    const newMessage = await ExchangeMessage.create({
      exchange: exchangeId,
      sender: currentUserId,
      receiver: receiverId,
      message: message.trim()
    });

    if (isMongoConnected) {
      try {
        const notif = await Notification.create({
          user: receiverId,
          title: '💬 New Exchange Message',
          message: `${req.user.full_name || 'Exchange Partner'}: "${message.trim().slice(0, 45)}..."`,
          type: 'exchange',
          link: '/exchanges'
        });

        // REAL-TIME PUSH
        emitNotification(receiverId, notif);
        emitMessageUpdate(currentUserId, receiverId, { type: 'exchange_message', data: newMessage });
      } catch (e) {}
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent cleanly.',
      data: newMessage
    });
  } catch (err) {
    console.error('Send exchange message error:', err);
    return res.status(500).json({ error: 'Failed to send exchange message.' });
  }
});

// 11. Get Exchange Messages (Participants Only)
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const exchangeId = req.params.id;

    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange proposal not found.' });
    }

    const currentUserId = req.user.id.toString();
    const requesterId = exchange.requester.toString();
    const ownerId = exchange.owner.toString();

    if (currentUserId !== requesterId && currentUserId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized. Only exchange participants can view messages for this exchange.' });
    }

    const messages = await ExchangeMessage.find({ exchange: exchangeId })
      .populate('sender', 'email phone')
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map((m) => ({
      id: m._id.toString(),
      exchange_id: m.exchange.toString(),
      sender_id: (m.sender?._id || m.sender).toString(),
      receiver_id: m.receiver.toString(),
      message: m.message,
      created_at: m.createdAt
    }));

    return res.json(formattedMessages);
  } catch (err) {
    console.error('Fetch exchange messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch exchange messages.' });
  }
});

export default router;

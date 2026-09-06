import Notification from '../models/Notification.js';
import BookRequest from '../models/BookRequest.js';
import Wishlist from '../models/Wishlist.js';
import Book from '../models/Book.js';
import UserProfile from '../models/UserProfile.js';
import { isMongoConnected, getStore, saveStore } from '../db/database.js';
import { emitNotification } from '../socket.js';
import { titlesMatch, normalizeTitle } from './titleNormalizer.js';

/**
 * Creates and dispatches a notification to a specific user.
 * Supports both MongoDB and JSON Document Store fallback mode.
 * Enforces deduplication to prevent duplicate alerts.
 */
export async function createNotification({
  user,
  type = 'system',
  title,
  message,
  link = null,
  relatedBook = null,
  relatedExchange = null,
  relatedRequest = null
}) {
  if (!user) return null;
  const userIdStr = user.toString();

  if (isMongoConnected) {
    try {
      // Deduplication check
      const query = {
        user: userIdStr,
        type,
        title
      };
      if (relatedBook) query.relatedBook = relatedBook;
      if (relatedExchange) query.relatedExchange = relatedExchange;
      if (relatedRequest) query.relatedRequest = relatedRequest;

      const existing = await Notification.findOne(query).lean();
      if (existing) {
        return {
          id: existing._id.toString(),
          ...existing
        };
      }

      const notif = await Notification.create({
        user: userIdStr,
        type,
        title,
        message,
        link,
        relatedBook,
        relatedExchange,
        relatedRequest
      });

      const formatted = {
        id: notif._id.toString(),
        _id: notif._id.toString(),
        user_id: userIdStr,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        link: notif.link,
        is_read: false,
        created_at: notif.createdAt
      };

      emitNotification(userIdStr, formatted);
      return formatted;
    } catch (err) {
      console.error('Create notification Mongo error:', err.message);
      return null;
    }
  } else {
    const store = getStore();
    if (!store.notifications) store.notifications = [];

    // Deduplication check
    const existing = store.notifications.find(
      (n) =>
        (n.user || n.user_id)?.toString() === userIdStr &&
        n.type === type &&
        n.title === title &&
        (relatedBook ? (n.relatedBook || n.related_book)?.toString() === relatedBook.toString() : true) &&
        (relatedExchange ? (n.relatedExchange || n.related_exchange)?.toString() === relatedExchange.toString() : true)
    );

    if (existing) return existing;

    const notifObj = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user: userIdStr,
      user_id: userIdStr,
      type,
      title,
      message,
      link,
      relatedBook: relatedBook ? relatedBook.toString() : null,
      relatedExchange: relatedExchange ? relatedExchange.toString() : null,
      relatedRequest: relatedRequest ? relatedRequest.toString() : null,
      isRead: false,
      is_read: false,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    store.notifications.unshift(notifObj);
    saveStore();

    emitNotification(userIdStr, notifObj);
    return notifObj;
  }
}

/**
 * Triggers relevant notifications when a new REAL book listing is published:
 * 1. Book Request notifications for users looking for this title.
 * 2. Wishlist notifications for users with this title in wishlist.
 * 3. Donation notifications for users with active requests if book is free.
 * 4. Reciprocal Exchange Match notifications if new book forms a reciprocal swap pair.
 */
export async function triggerNotificationsForNewBook(newBook, sellerUser) {
  const sellerIdStr = (newBook.seller?._id || newBook.seller || sellerUser?.id || sellerUser?._id || '').toString();
  const bookIdStr = (newBook._id || newBook.id || '').toString();
  const bookTitle = newBook.title || '';
  const transType = (newBook.transactionType || newBook.transaction_type || 'buy').toLowerCase();
  const wantedTitle = newBook.wantedBookTitle || newBook.wanted_book_title || '';

  if (!sellerIdStr || !bookTitle) return;

  if (isMongoConnected) {
    try {
      // 1. Check Active Book Requests
      const activeRequests = await BookRequest.find({
        status: 'active',
        requester: { $ne: sellerIdStr }
      }).lean();

      for (const reqDoc of activeRequests) {
        const reqUserIdStr = (reqDoc.requester?._id || reqDoc.requester).toString();
        if (titlesMatch(bookTitle, reqDoc.title) || titlesMatch(bookTitle, reqDoc.subject)) {
          // Free donation notification if book is donated
          if (transType === 'donate') {
            await createNotification({
              user: reqUserIdStr,
              type: 'request',
              title: '🎁 Free Book Available!',
              message: `A book you requested ("${bookTitle}") is now available for FREE donation!`,
              link: `/books/${bookIdStr}`,
              relatedBook: bookIdStr,
              relatedRequest: reqDoc._id.toString()
            });
          } else {
            await createNotification({
              user: reqUserIdStr,
              type: 'request',
              title: '📚 Book Available',
              message: `"${bookTitle}" is now available on campus matching your request!`,
              link: `/books/${bookIdStr}`,
              relatedBook: bookIdStr,
              relatedRequest: reqDoc._id.toString()
            });
          }
        }
      }

      // 2. Check Wishlists
      const wishlists = await Wishlist.find({
        user: { $ne: sellerIdStr }
      }).populate('book').lean();

      for (const wItem of wishlists) {
        const wUserIdStr = (wItem.user?._id || wItem.user).toString();
        const wBookTitle = wItem.book?.title;
        if (wBookTitle && titlesMatch(bookTitle, wBookTitle)) {
          await createNotification({
            user: wUserIdStr,
            type: 'system',
            title: '📚 Wishlist Book Available',
            message: `"${bookTitle}" from your wishlist is now available!`,
            link: `/books/${bookIdStr}`,
            relatedBook: bookIdStr
          });
        }
      }

      // 3. Check Exchange Matches if this is an exchange listing
      if (transType === 'exchange' && wantedTitle) {
        const otherExchanges = await Book.find({
          seller: { $ne: sellerIdStr },
          status: 'available',
          $or: [
            { transactionType: 'exchange' },
            { transaction_type: 'exchange' }
          ]
        }).lean();

        for (const otherBook of otherExchanges) {
          const otherSellerIdStr = (otherBook.seller?._id || otherBook.seller).toString();
          const otherWantedTitle = otherBook.wantedBookTitle || otherBook.wanted_book_title || '';
          const otherTitle = otherBook.title || '';

          // Check reciprocal matching:
          // my wanted -> other's offered AND other's wanted -> my offered
          const matchDirection1 = titlesMatch(wantedTitle, otherTitle);
          const matchDirection2 = titlesMatch(otherWantedTitle, bookTitle);

          if (matchDirection1 && matchDirection2) {
            // Notify Other Seller
            await createNotification({
              user: otherSellerIdStr,
              type: 'exchange',
              title: '🎯 Exchange Match Found',
              message: `Your "${otherTitle}" listing matches another student's wanted book "${bookTitle}"!`,
              link: '/exchanges',
              relatedBook: bookIdStr,
              relatedExchange: `MATCH-${bookIdStr}-${otherBook._id}`
            });

            // Notify Current Seller
            await createNotification({
              user: sellerIdStr,
              type: 'exchange',
              title: '🎯 Exchange Match Found',
              message: `Your "${bookTitle}" listing matches another student's wanted book "${otherTitle}"!`,
              link: '/exchanges',
              relatedBook: otherBook._id.toString(),
              relatedExchange: `MATCH-${bookIdStr}-${otherBook._id}`
            });
          }
        }
      }
    } catch (err) {
      console.error('Trigger notifications Mongo error:', err.message);
    }
  } else {
    // JSON DOCUMENT STORE FALLBACK MODE
    const store = getStore();
    const activeRequests = (store.bookrequests || []).filter(
      (r) => r.status === 'active' && (r.requester || r.requester_id)?.toString() !== sellerIdStr
    );

    for (const reqDoc of activeRequests) {
      const reqUserIdStr = (reqDoc.requester || reqDoc.requester_id || '').toString();
      if (titlesMatch(bookTitle, reqDoc.title) || titlesMatch(bookTitle, reqDoc.subject)) {
        if (transType === 'donate') {
          await createNotification({
            user: reqUserIdStr,
            type: 'request',
            title: '🎁 Free Book Available!',
            message: `A book you requested ("${bookTitle}") is now available for FREE donation!`,
            link: `/books/${bookIdStr}`,
            relatedBook: bookIdStr,
            relatedRequest: reqDoc.id || reqDoc._id
          });
        } else {
          await createNotification({
            user: reqUserIdStr,
            type: 'request',
            title: '📚 Book Available',
            message: `"${bookTitle}" is now available on campus matching your request!`,
            link: `/books/${bookIdStr}`,
            relatedBook: bookIdStr,
            relatedRequest: reqDoc.id || reqDoc._id
          });
        }
      }
    }

    // Wishlist check in Store
    const wishlists = (store.wishlists || []).filter(
      (w) => (w.user || w.user_id)?.toString() !== sellerIdStr
    );

    for (const wItem of wishlists) {
      const wUserIdStr = (wItem.user || wItem.user_id)?.toString();
      const savedBook = (store.books || []).find((b) => (b.id || b._id)?.toString() === (wItem.book || wItem.book_id)?.toString());
      const wBookTitle = savedBook?.title;

      if (wBookTitle && titlesMatch(bookTitle, wBookTitle)) {
        await createNotification({
          user: wUserIdStr,
          type: 'system',
          title: '📚 Wishlist Book Available',
          message: `"${bookTitle}" from your wishlist is now available!`,
          link: `/books/${bookIdStr}`,
          relatedBook: bookIdStr
        });
      }
    }

    // Exchange match check in Store
    if (transType === 'exchange' && wantedTitle) {
      const otherExchanges = (store.books || []).filter((b) => {
        const bSellerStr = (b.seller?._id || b.seller || '').toString();
        const bTransType = (b.transactionType || b.transaction_type || '').toLowerCase();
        return bSellerStr !== sellerIdStr && b.status === 'available' && bTransType === 'exchange';
      });

      for (const otherBook of otherExchanges) {
        const otherSellerIdStr = (otherBook.seller?._id || otherBook.seller || '').toString();
        const otherWantedTitle = otherBook.wantedBookTitle || otherBook.wanted_book_title || '';
        const otherTitle = otherBook.title || '';

        const matchDirection1 = titlesMatch(wantedTitle, otherTitle);
        const matchDirection2 = titlesMatch(otherWantedTitle, bookTitle);

        if (matchDirection1 && matchDirection2) {
          const otherBookIdStr = (otherBook.id || otherBook._id).toString();

          await createNotification({
            user: otherSellerIdStr,
            type: 'exchange',
            title: '🎯 Exchange Match Found',
            message: `Your "${otherTitle}" listing matches another student's wanted book "${bookTitle}"!`,
            link: '/exchanges',
            relatedBook: bookIdStr,
            relatedExchange: `MATCH-${bookIdStr}-${otherBookIdStr}`
          });

          await createNotification({
            user: sellerIdStr,
            type: 'exchange',
            title: '🎯 Exchange Match Found',
            message: `Your "${bookTitle}" listing matches another student's wanted book "${otherTitle}"!`,
            link: '/exchanges',
            relatedBook: otherBookIdStr,
            relatedExchange: `MATCH-${bookIdStr}-${otherBookIdStr}`
          });
        }
      }
    }
  }
}

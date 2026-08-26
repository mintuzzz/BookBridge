import { isMongoConnected, getStore, saveStore } from './database.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import Book from '../models/Book.js';
import Order from '../models/Order.js';
import Exchange from '../models/Exchange.js';
import Donation from '../models/Donation.js';
import BookRequest from '../models/BookRequest.js';
import Wishlist from '../models/Wishlist.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Review from '../models/Review.js';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';
import PickupVerification from '../models/PickupVerification.js';
import EcoPoint from '../models/EcoPoint.js';
import AdminAction from '../models/AdminAction.js';

export const findBooks = async (filterQuery = {}) => {
  if (isMongoConnected) {
    return await Book.find(filterQuery).sort({ createdAt: -1 }).lean();
  }
  const store = getStore();
  let books = [...store.books];

  if (filterQuery.status) {
    if (typeof filterQuery.status === 'object' && filterQuery.status.$in) {
      books = books.filter((b) => filterQuery.status.$in.includes(b.status));
    } else {
      books = books.filter((b) => b.status === filterQuery.status);
    }
  }

  if (filterQuery.seller) {
    books = books.filter((b) => (b.seller?._id || b.seller).toString() === filterQuery.seller.toString());
  }

  if (filterQuery.department && filterQuery.department !== 'All') {
    books = books.filter((b) => b.department === filterQuery.department);
  }

  if (filterQuery.semester && filterQuery.semester !== 'All') {
    books = books.filter((b) => b.semester === parseInt(filterQuery.semester, 10));
  }

  if (filterQuery.condition && filterQuery.condition !== 'All') {
    books = books.filter((b) => b.condition === filterQuery.condition);
  }

  if (filterQuery.transactionType && filterQuery.transactionType !== 'All') {
    books = books.filter((b) => b.transactionType === filterQuery.transactionType);
  }

  if (filterQuery.sellingPrice && filterQuery.sellingPrice.$lte) {
    books = books.filter((b) => b.sellingPrice <= filterQuery.sellingPrice.$lte);
  }

  if (filterQuery.$or && filterQuery.$or[0]?.$regex) {
    const term = filterQuery.$or[0].$regex.toLowerCase();
    books = books.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term) ||
        (b.isbn && b.isbn.toLowerCase().includes(term)) ||
        b.subject.toLowerCase().includes(term)
    );
  }

  return books;
};

export const findBookById = async (id) => {
  if (isMongoConnected) {
    return await Book.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true }).lean();
  }
  const store = getStore();
  const book = store.books.find((b) => (b._id || b.id).toString() === id.toString());
  if (book) {
    book.viewCount = (book.viewCount || 0) + 1;
    saveStore();
  }
  return book;
};

export const createBook = async (data) => {
  if (isMongoConnected) {
    return await Book.create(data);
  }
  const store = getStore();
  const newBook = {
    id: `book_${Date.now()}`,
    _id: `book_${Date.now()}`,
    ...data,
    viewCount: 0,
    status: 'available',
    createdAt: new Date().toISOString()
  };
  store.books.push(newBook);
  saveStore();
  return newBook;
};

export const findUserProfilesMap = async (userIds = []) => {
  const map = new Map();
  if (isMongoConnected) {
    const profiles = await UserProfile.find({ user: { $in: userIds } }).lean();
    profiles.forEach((p) => map.set(p.user.toString(), p));
    return map;
  }
  const store = getStore();
  store.userprofiles.forEach((p) => {
    map.set((p.user?._id || p.user).toString(), p);
  });
  return map;
};

export default {
  findBooks,
  findBookById,
  createBook,
  findUserProfilesMap
};

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mongoStorePath = path.join(__dirname, 'mongodb_store.json');

export let isMongoConnected = false;

export const checkIsMongoConnected = () => {
  const connected = mongoose.connection && mongoose.connection.readyState === 1;
  if (connected) isMongoConnected = true;
  return connected;
};

// Listen to connection lifecycle events to keep state synchronized
mongoose.connection.on('connected', () => {
  isMongoConnected = true;
  console.log('🍃 Mongoose connection established to MongoDB Atlas.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected from MongoDB.');
  isMongoConnected = false;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
  isMongoConnected = false;
});

export const initDb = async () => {
  if (checkIsMongoConnected()) {
    isMongoConnected = true;
    return true;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookbridge';

  try {
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);
    console.log(`🍃 Connecting to MongoDB...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000
    });
    isMongoConnected = true;
    console.log(`✅ Connected to MongoDB Database server cleanly.`);
    return true;
  } catch (err) {
    console.log(`ℹ️ MongoDB connection unavailable (${err.message}). Using persistent MongoDB JSON Document Store.`);
    isMongoConnected = false;
    return false;
  }
};

let localData = {
  users: [],
  userprofiles: [],
  books: [],
  orders: [],
  exchanges: [],
  exchangematches: [],
  donations: [],
  bookrequests: [],
  wishlists: [],
  conversations: [],
  messages: [],
  reviews: [],
  reports: [],
  notifications: [],
  pickupverifications: [],
  ecopoints: [],
  adminactions: [],
  sessions: [],
  otpverifications: []
};

export const getStore = () => {
  if (fs.existsSync(mongoStorePath)) {
    try {
      localData = JSON.parse(fs.readFileSync(mongoStorePath, 'utf8'));
      if (!localData.otpverifications) localData.otpverifications = [];
    } catch (e) {}
  }
  return localData;
};

export const saveStore = () => {
  fs.writeFileSync(mongoStorePath, JSON.stringify(localData, null, 2), 'utf8');
};

export default initDb;

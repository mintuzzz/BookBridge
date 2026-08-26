import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import initDb from './db/database.js';
import { initSocket } from './socket.js';

import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import ordersRoutes from './routes/orders.js';
import exchangesRoutes from './routes/exchanges.js';
import donationsRoutes from './routes/donations.js';
import requestsRoutes from './routes/requests.js';
import wishlistRoutes from './routes/wishlist.js';
import messagesRoutes from './routes/messages.js';
import reviewsRoutes from './routes/reviews.js';
import reportsRoutes from './routes/reports.js';
import notificationsRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Real-Time Socket.IO Server
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Uploaded Book Images Statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/exchanges', exchangesRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'BookBridge Express MongoDB API', version: '2.0.0' });
});

// Initialize DB and start HTTP + Socket.IO server cleanly
const startServer = async () => {
  try {
    await initDb();

    server.listen(PORT, () => {
      console.log(`🚀 BookBridge Express MongoDB API & Socket.IO server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    server.listen(PORT, () => {
      console.log(`🚀 BookBridge Express API & Socket.IO server running on http://localhost:${PORT}`);
    });
  }
};

startServer();

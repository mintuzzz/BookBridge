import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

// CORS Configuration supporting Production Vercel Frontend & Local Development
const allowedOrigins = [
  'https://book-bridge-blue.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:3000'
];

if (process.env.FRONTEND_URL) {
  const envUrl = process.env.FRONTEND_URL.trim().replace(/\/$/, '');
  if (!allowedOrigins.includes(envUrl)) {
    allowedOrigins.push(envUrl);
  }
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.warn(`⚠️ [CORS BLOCKED] Origin: ${origin} not in allowedOrigins`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Uploaded Book Images Statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Fallback proxy route for uploaded assets (e.g. books uploaded on Render or remote storage)
app.get('/uploads/:folder/:filename', async (req, res) => {
  const { folder, filename } = req.params;
  const localDir = path.join(__dirname, '..', 'uploads', folder);
  const localFile = path.join(localDir, filename);

  if (fs.existsSync(localFile)) {
    return res.sendFile(localFile);
  }

  const remoteUrl = `https://bookbridge-api-394s.onrender.com/uploads/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
  try {
    const remoteRes = await fetch(remoteUrl);
    if (remoteRes.ok) {
      const buffer = Buffer.from(await remoteRes.arrayBuffer());
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      try {
        fs.writeFileSync(localFile, buffer);
      } catch (writeErr) {
        console.warn('Failed to cache remote image locally:', writeErr.message);
      }
      const contentType = remoteRes.headers.get('content-type') || (filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }
  } catch (err) {
    console.warn(`Could not proxy remote image ${remoteUrl}:`, err.message);
  }

  return res.status(404).send('Image not found');
});


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

// Catch-all 404 handler for unmatched API routes - ALWAYS return JSON, never HTML
app.use('/api/*', (req, res) => {
  return res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global API Error Handler - ALWAYS return JSON
app.use((err, req, res, next) => {
  console.error('Global API Error:', err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
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

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Authenticate socket connections using JWT token from handshake
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        console.warn('⚡ [SOCKET ERROR] Connection rejected: Missing authentication token.');
        return next(new Error('Authentication error: Missing token'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'bookbridge_super_secret_jwt_key_2026_production'
      );

      socket.userId = decoded.id.toString();
      console.log(`🔌 [SOCKET CONNECTED] Socket ID: ${socket.id} | Authenticated User ID: ${socket.userId}`);
      next();
    } catch (err) {
      console.warn(`⚡ [SOCKET ERROR] Connection authentication failed: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);
    console.log(`🚪 [SOCKET ROOM JOINED] User ID: ${socket.userId} joined private room: ${userRoom}`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [SOCKET DISCONNECTED] User ID: ${socket.userId} | Socket ID: ${socket.id} | Reason: ${reason}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

// Emit notification specifically to target user's authenticated private room
export function emitNotification(targetUserId, notificationData) {
  if (!io || !targetUserId) return;
  const targetIdStr = targetUserId.toString();
  const userRoom = `user_${targetIdStr}`;

  console.log(`📡 [SOCKET EMIT NOTIFICATION] Target User ID: ${targetIdStr} | Room: ${userRoom} | Title: "${notificationData.title || notificationData.message}"`);

  io.to(userRoom).emit('notification:new', notificationData);
}

// Emit exchange status update to both participants' rooms
export function emitExchangeUpdate(user1Id, user2Id, payload) {
  if (!io) return;
  const u1 = user1Id ? user1Id.toString() : null;
  const u2 = user2Id ? user2Id.toString() : null;

  console.log(`📡 [SOCKET EMIT EXCHANGE UPDATE] Target Users: [${u1}, ${u2}] | Type: ${payload.type}`);

  if (u1) io.to(`user_${u1}`).emit('exchange:updated', payload);
  if (u2) io.to(`user_${u2}`).emit('exchange:updated', payload);
}

// Emit order status update to both participants' rooms
export function emitOrderUpdate(user1Id, user2Id, payload) {
  if (!io) return;
  const u1 = user1Id ? user1Id.toString() : null;
  const u2 = user2Id ? user2Id.toString() : null;

  console.log(`📡 [SOCKET EMIT ORDER UPDATE] Target Users: [${u1}, ${u2}] | Type: ${payload.type}`);

  if (u1) io.to(`user_${u1}`).emit('order:updated', payload);
  if (u2) io.to(`user_${u2}`).emit('order:updated', payload);
}

// Emit transaction message update to both participants' rooms
export function emitMessageUpdate(user1Id, user2Id, payload) {
  if (!io) return;
  const u1 = user1Id ? user1Id.toString() : null;
  const u2 = user2Id ? user2Id.toString() : null;

  console.log(`📡 [SOCKET EMIT MESSAGE RECEIVED] Target Users: [${u1}, ${u2}] | Type: ${payload.type}`);

  if (u1) io.to(`user_${u1}`).emit('message:received', payload);
  if (u2) io.to(`user_${u2}`).emit('message:received', payload);
}

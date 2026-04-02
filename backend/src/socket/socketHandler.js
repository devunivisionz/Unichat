const jwt = require('jsonwebtoken');
const User = require('../models/User');

const onlineUsers = new Map(); // userId -> Set of socketIds
const typingUsers = new Map(); // roomId -> Map(userId -> timeout)

module.exports = (io) => {
  // Auth middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const user = await User.findById(decoded.userId).select('-password -refreshToken');
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${userId} (${socket.id})`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for direct notifications
    socket.join(`user:${userId}`);

    // Update status to online
    await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
    io.emit('user:presence_update', { userId, status: 'online' });

    // ─── Workspace Events ───────────────────────────────────────────────────
    socket.on('workspace:join', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      console.log(`📦 ${userId} joined workspace: ${workspaceId}`);
    });

    socket.on('workspace:leave', (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    // ─── Channel Events ─────────────────────────────────────────────────────
    socket.on('channel:join', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('channel:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
      // Stop typing if was typing
      const key = `channel:${channelId}`;
      stopTyping(io, key, userId);
    });

    // ─── DM Events ──────────────────────────────────────────────────────────
    socket.on('dm:join', (dmId) => {
      socket.join(`dm:${dmId}`);
    });

    socket.on('dm:leave', (dmId) => {
      socket.leave(`dm:${dmId}`);
      const key = `dm:${dmId}`;
      stopTyping(io, key, userId);
    });

    // ─── Thread Events ──────────────────────────────────────────────────────
    socket.on('thread:join', (parentMessageId) => {
      socket.join(`thread:${parentMessageId}`);
    });

    socket.on('thread:leave', (parentMessageId) => {
      socket.leave(`thread:${parentMessageId}`);
    });

    // ─── Typing Indicators ──────────────────────────────────────────────────
    socket.on('typing:start', ({ roomType, roomId }) => {
      const key = `${roomType}:${roomId}`;
      if (!typingUsers.has(key)) typingUsers.set(key, new Map());
      const roomTyping = typingUsers.get(key);

      // Clear existing timeout
      if (roomTyping.has(userId)) clearTimeout(roomTyping.get(userId));

      // Broadcast typing start
      socket.to(key).emit('typing:update', {
        roomId, roomType,
        typingUsers: [...roomTyping.keys()].filter(id => id !== userId).concat([userId]),
        userId,
        displayName: socket.user.displayName,
        avatar: socket.user.avatar,
        action: 'start',
      });

      // Auto-stop typing after 4s
      const timeout = setTimeout(() => {
        stopTyping(io, key, userId, roomType, roomId);
      }, 4000);
      roomTyping.set(userId, timeout);
    });

    socket.on('typing:stop', ({ roomType, roomId }) => {
      const key = `${roomType}:${roomId}`;
      stopTyping(io, key, userId, roomType, roomId);
    });

    // ─── Presence ───────────────────────────────────────────────────────────
    socket.on('presence:update', async ({ status, statusMessage }) => {
      await User.findByIdAndUpdate(userId, { status, statusMessage });
      io.emit('user:presence_update', { userId, status, statusMessage });
    });

    // ─── Read Receipts ───────────────────────────────────────────────────────
    socket.on('message:read', ({ channelId, dmId, messageId }) => {
      const room = channelId ? `channel:${channelId}` : `dm:${dmId}`;
      socket.to(room).emit('message:read_receipt', { userId, messageId });
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${userId}`);
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
          io.emit('user:presence_update', { userId, status: 'offline', lastSeen: new Date() });
        }
      }

      // Clean up typing indicators
      typingUsers.forEach((roomTyping, key) => {
        if (roomTyping.has(userId)) {
          clearTimeout(roomTyping.get(userId));
          roomTyping.delete(userId);
          const [roomType, roomId] = key.split(':');
          io.to(key).emit('typing:update', {
            roomId, roomType,
            typingUsers: [...roomTyping.keys()],
            userId,
            action: 'stop',
          });
        }
      });
    });
  });
};

function stopTyping(io, key, userId, roomType, roomId) {
  if (!typingUsers.has(key)) return;
  const roomTyping = typingUsers.get(key);
  if (roomTyping.has(userId)) {
    clearTimeout(roomTyping.get(userId));
    roomTyping.delete(userId);
    const parts = key.split(':');
    const rt = roomType || parts[0];
    const rid = roomId || parts.slice(1).join(':');
    io.to(key).emit('typing:update', {
      roomId: rid, roomType: rt,
      typingUsers: [...roomTyping.keys()],
      userId,
      action: 'stop',
    });
  }
}

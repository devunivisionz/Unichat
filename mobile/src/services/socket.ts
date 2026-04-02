import { io, Socket } from 'socket.io-client';

const SOCKET_URL = __DEV__ ? 'http://192.168.1.56:4001' : 'https://your-production-server.com';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('🔌 Socket error:', err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinWorkspace = (workspaceId: string) => {
  socket?.emit('workspace:join', workspaceId);
};

export const leaveWorkspace = (workspaceId: string) => {
  socket?.emit('workspace:leave', workspaceId);
};

export const joinChannel = (channelId: string) => {
  socket?.emit('channel:join', channelId);
};

export const leaveChannel = (channelId: string) => {
  socket?.emit('channel:leave', channelId);
};

export const joinDM = (dmId: string) => {
  socket?.emit('dm:join', dmId);
};

export const leaveDM = (dmId: string) => {
  socket?.emit('dm:leave', dmId);
};

export const joinThread = (parentMessageId: string) => {
  socket?.emit('thread:join', parentMessageId);
};

export const leaveThread = (parentMessageId: string) => {
  socket?.emit('thread:leave', parentMessageId);
};

export const startTyping = (roomType: 'channel' | 'dm', roomId: string) => {
  socket?.emit('typing:start', { roomType, roomId });
};

export const stopTyping = (roomType: 'channel' | 'dm', roomId: string) => {
  socket?.emit('typing:stop', { roomType, roomId });
};

export const updatePresence = (status: string, statusMessage?: string) => {
  socket?.emit('presence:update', { status, statusMessage });
};

export const emitMessageRead = (channelId?: string, dmId?: string, messageId?: string) => {
  socket?.emit('message:read', { channelId, dmId, messageId });
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  joinWorkspace,
  leaveWorkspace,
  joinChannel,
  leaveChannel,
  joinDM,
  leaveDM,
  joinThread,
  leaveThread,
  startTyping,
  stopTyping,
  updatePresence,
  emitMessageRead,
};

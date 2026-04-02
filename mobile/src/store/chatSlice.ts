import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';

interface Message {
  _id: string;
  content: string;
  sender: { _id: string; displayName: string; avatar: string | null; username: string };
  attachments: any[];
  reactions: Array<{ emoji: string; users: string[]; count: number }>;
  thread: { parentMessage: string | null; replyCount: number; lastReplyAt: string; participants: any[] };
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  isSystemMessage: boolean;
  createdAt: string;
  channel?: string;
  dm?: string;
}

interface Channel {
  _id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  workspace: string;
  members: any[];
  unreadCount: number;
  isMember: boolean;
  isDefault: boolean;
  topic?: string;
  lastActivity: string;
}

interface DM {
  _id: string;
  participants: any[];
  isGroup: boolean;
  groupName?: string;
  lastMessage: Message | null;
  unreadCount: number;
  lastActivity: string;
}

interface TypingUser {
  userId: string;
  displayName: string;
  avatar?: string;
}

interface ChatState {
  channels: Channel[];
  dms: DM[];
  activeChannelId: string | null;
  activeDMId: string | null;
  messages: Record<string, Message[]>;
  threadMessages: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  isLoadingMessages: boolean;
  typingUsers: Record<string, TypingUser[]>;
  isLoadingChannels: boolean;
}

const initialState: ChatState = {
  channels: [],
  dms: [],
  activeChannelId: null,
  activeDMId: null,
  messages: {},
  threadMessages: {},
  hasMore: {},
  isLoadingMessages: false,
  typingUsers: {},
  isLoadingChannels: false,
};

export const fetchChannels = createAsyncThunk(
  'chat/fetchChannels',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const result = await api.channels.list(workspaceId);
      return result.channels;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const fetchDMs = createAsyncThunk(
  'chat/fetchDMs',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const result = await api.dms.list(workspaceId);
      return result.dms;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const fetchChannelMessages = createAsyncThunk(
  'chat/fetchChannelMessages',
  async ({ channelId, before }: { channelId: string; before?: string }, { rejectWithValue }) => {
    try {
      const result = await api.messages.channel(channelId, before);
      return { channelId, messages: result.messages, hasMore: result.hasMore, before };
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const fetchDMMessages = createAsyncThunk(
  'chat/fetchDMMessages',
  async ({ dmId, before }: { dmId: string; before?: string }, { rejectWithValue }) => {
    try {
      const result = await api.dms.messages(dmId, before);
      return { dmId, messages: result.messages, hasMore: result.hasMore, before };
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const fetchThreadMessages = createAsyncThunk(
  'chat/fetchThreadMessages',
  async (parentId: string, { rejectWithValue }) => {
    try {
      const result = await api.messages.thread(parentId);
      return { parentId, parent: result.parent, replies: result.replies };
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (data: {
    workspaceId: string;
    channelId?: string;
    dmId?: string;
    content?: string;
    attachments?: any[];
    parentMessageId?: string;
  }, { rejectWithValue }) => {
    try {
      const result = await api.messages.send(data);
      return result.message;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const createDM = createAsyncThunk(
  'chat/createDM',
  async (data: any, { rejectWithValue }) => {
    try {
      const result = await api.dms.create(data);
      return result.dm;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveChannel(state, action: PayloadAction<string | null>) {
      state.activeChannelId = action.payload;
      state.activeDMId = null;
    },
    setActiveDM(state, action: PayloadAction<string | null>) {
      state.activeDMId = action.payload;
      state.activeChannelId = null;
    },
    addMessage(state, action: PayloadAction<{ roomId: string; message: Message }>) {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) state.messages[roomId] = [];
      const exists = state.messages[roomId].some(m => m._id === message._id);
      if (!exists) state.messages[roomId].push(message);
      // Update unread count if not active
      if (message.channel) {
        const ch = state.channels.find(c => c._id === message.channel);
        if (ch && ch._id !== state.activeChannelId) ch.unreadCount = (ch.unreadCount || 0) + 1;
      }
      if (message.dm) {
        const dm = state.dms.find(d => d._id === message.dm);
        if (dm) {
          dm.lastMessage = message;
          if (dm._id !== state.activeDMId) dm.unreadCount = (dm.unreadCount || 0) + 1;
        }
      }
    },
    updateMessage(state, action: PayloadAction<{ roomId: string; message: Message }>) {
      const { roomId, message } = action.payload;
      const msgs = state.messages[roomId];
      if (msgs) {
        const idx = msgs.findIndex(m => m._id === message._id);
        if (idx > -1) msgs[idx] = message;
      }
    },
    deleteMessage(state, action: PayloadAction<{ roomId: string; messageId: string }>) {
      const { roomId, messageId } = action.payload;
      const msgs = state.messages[roomId];
      if (msgs) {
        const msg = msgs.find(m => m._id === messageId);
        if (msg) { msg.isDeleted = true; msg.content = ''; }
      }
    },
    updateReactions(state, action: PayloadAction<{ roomId: string; messageId: string; reactions: any[] }>) {
      const { roomId, messageId, reactions } = action.payload;
      const msgs = state.messages[roomId];
      if (msgs) {
        const msg = msgs.find(m => m._id === messageId);
        if (msg) msg.reactions = reactions;
      }
    },
    addThreadReply(state, action: PayloadAction<{ parentId: string; message: Message }>) {
      const { parentId, message } = action.payload;
      if (!state.threadMessages[parentId]) state.threadMessages[parentId] = [];
      const exists = state.threadMessages[parentId].some(m => m._id === message._id);
      if (!exists) state.threadMessages[parentId].push(message);
    },
    setTypingUsers(state, action: PayloadAction<{ roomId: string; users: TypingUser[] }>) {
      state.typingUsers[action.payload.roomId] = action.payload.users;
    },
    markChannelRead(state, action: PayloadAction<string>) {
      const ch = state.channels.find(c => c._id === action.payload);
      if (ch) ch.unreadCount = 0;
    },
    markDMRead(state, action: PayloadAction<string>) {
      const dm = state.dms.find(d => d._id === action.payload);
      if (dm) dm.unreadCount = 0;
    },
    updatePresence(state, action: PayloadAction<{ userId: string; status: string }>) {
      // Update member status in DMs
      state.dms.forEach(dm => {
        dm.participants.forEach((p: any) => {
          if (p._id === action.payload.userId) p.status = action.payload.status;
        });
      });
    },
    addChannel(state, action: PayloadAction<Channel>) {
      const exists = state.channels.find(c => c._id === action.payload._id);
      if (!exists) state.channels.push(action.payload);
    },
    addDM(state, action: PayloadAction<DM>) {
      const exists = state.dms.find(d => d._id === action.payload._id);
      if (!exists) state.dms.unshift(action.payload);
    },
    updateThreadReplyCount(state, action: PayloadAction<{ messageId: string; roomId: string }>) {
      const msgs = state.messages[action.payload.roomId];
      if (msgs) {
        const msg = msgs.find(m => m._id === action.payload.messageId);
        if (msg) msg.thread.replyCount += 1;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch channels
    builder.addCase(fetchChannels.pending, (s) => { s.isLoadingChannels = true; });
    builder.addCase(fetchChannels.fulfilled, (s, a) => { s.channels = a.payload; s.isLoadingChannels = false; });
    builder.addCase(fetchChannels.rejected, (s) => { s.isLoadingChannels = false; });

    // Fetch DMs
    builder.addCase(fetchDMs.fulfilled, (s, a) => { s.dms = a.payload; });

    // Fetch channel messages
    builder.addCase(fetchChannelMessages.pending, (s) => { s.isLoadingMessages = true; });
    builder.addCase(fetchChannelMessages.fulfilled, (s, a) => {
      const { channelId, messages, hasMore, before } = a.payload;
      s.isLoadingMessages = false;
      if (before) {
        s.messages[channelId] = [...messages, ...(s.messages[channelId] || [])];
      } else {
        s.messages[channelId] = messages;
      }
      s.hasMore[channelId] = hasMore;
    });
    builder.addCase(fetchChannelMessages.rejected, (s) => { s.isLoadingMessages = false; });

    // Fetch DM messages
    builder.addCase(fetchDMMessages.pending, (s) => { s.isLoadingMessages = true; });
    builder.addCase(fetchDMMessages.fulfilled, (s, a) => {
      const { dmId, messages, hasMore, before } = a.payload;
      s.isLoadingMessages = false;
      if (before) {
        s.messages[dmId] = [...messages, ...(s.messages[dmId] || [])];
      } else {
        s.messages[dmId] = messages;
      }
      s.hasMore[dmId] = hasMore;
    });
    builder.addCase(fetchDMMessages.rejected, (s) => { s.isLoadingMessages = false; });

    // Fetch thread
    builder.addCase(fetchThreadMessages.fulfilled, (s, a) => {
      s.threadMessages[a.payload.parentId] = a.payload.replies;
    });

    // Send message
    builder.addCase(sendMessage.fulfilled, (s, a) => {
      const msg = a.payload;
      const roomId = msg.channel || msg.dm;
      if (roomId && !msg.thread?.parentMessage) {
        if (!s.messages[roomId]) s.messages[roomId] = [];
        const exists = s.messages[roomId].some(m => m._id === msg._id);
        if (!exists) s.messages[roomId].push(msg);
      }
    });

    // Create DM
    builder.addCase(createDM.fulfilled, (s, a) => {
      const exists = s.dms.find(d => d._id === a.payload._id);
      if (!exists) s.dms.unshift(a.payload);
    });
  },
});

export const {
  setActiveChannel, setActiveDM, addMessage, updateMessage, deleteMessage,
  updateReactions, addThreadReply, setTypingUsers, markChannelRead, markDMRead,
  updatePresence, addChannel, addDM, updateThreadReplyCount,
} = chatSlice.actions;

export default chatSlice.reducer;

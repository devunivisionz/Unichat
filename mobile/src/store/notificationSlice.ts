import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';

interface Notification {
  _id: string;
  type: string;
  actor: any;
  message?: any;
  channel?: any;
  content: string;
  isRead: boolean;
  createdAt: string;
  workspace?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (page: number = 1) => {
    const result = await api.notifications.list(page);
    return result;
  }
);

export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await api.notifications.markAllRead();
});

const notifSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Notification>) {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.notifications.find(n => n._id === action.payload);
      if (n && !n.isRead) { n.isRead = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNotifications.pending, (s) => { s.isLoading = true; });
    builder.addCase(fetchNotifications.fulfilled, (s, a) => {
      s.notifications = a.payload.notifications;
      s.unreadCount = a.payload.unreadCount;
      s.isLoading = false;
    });
    builder.addCase(fetchNotifications.rejected, (s) => { s.isLoading = false; });
    builder.addCase(markAllRead.fulfilled, (s) => {
      s.notifications.forEach(n => { n.isRead = true; });
      s.unreadCount = 0;
    });
  },
});

export const { addNotification, markRead } = notifSlice.actions;
export default notifSlice.reducer;

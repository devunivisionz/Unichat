import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setTokens, clearTokens } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  avatarPublicId?: string | null;
  status: 'online' | 'away' | 'busy' | 'offline';
  statusMessage: string;
  bio: string;
  title: string;
  timezone: string;
  lastSeen: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  soundEnabled: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
  soundEnabled: true,
};

export const register = createAsyncThunk(
  'auth/register',
  async (data: { email: string; password: string; username: string; displayName: string }, { rejectWithValue }) => {
    try {
      const result = await api.auth.register(data);
      return result;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await api.auth.login(data);
      return result;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const [storedToken, storedRefresh] = await AsyncStorage.multiGet(['accessToken', 'refreshToken']);
      const at = storedToken[1];
      const rt = storedRefresh[1];
      if (!at || !rt) return null;
      setTokens(at, rt);
      const result = await api.auth.me();
      return { user: result.user, accessToken: at, refreshToken: rt };
    } catch {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      clearTokens();
      return null;
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await api.auth.logout(); } catch {}
  disconnectSocket();
  clearTokens();
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: Partial<User>, { rejectWithValue }) => {
    try {
      const result = await api.users.updateProfile(data);
      return result.user;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    updateUserStatus(state, action: PayloadAction<{ status: string; statusMessage?: string }>) {
      if (state.user) {
        state.user.status = action.payload.status as any;
        if (action.payload.statusMessage !== undefined) {
          state.user.statusMessage = action.payload.statusMessage;
        }
      }
    },
    clearError(state) {
      state.error = null;
    },
    setSoundEnabled(state, action: PayloadAction<boolean>) {
      state.soundEnabled = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(register.fulfilled, (s, a) => {
      s.isLoading = false;
      s.user = a.payload.user;
      s.accessToken = a.payload.accessToken;
      s.isAuthenticated = true;
      setTokens(a.payload.accessToken, a.payload.refreshToken);
      initSocket(a.payload.accessToken);
      AsyncStorage.multiSet([['accessToken', a.payload.accessToken], ['refreshToken', a.payload.refreshToken]]);
    });
    builder.addCase(register.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string; });

    // Login
    builder.addCase(login.pending, (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(login.fulfilled, (s, a) => {
      s.isLoading = false;
      s.user = a.payload.user;
      s.accessToken = a.payload.accessToken;
      s.isAuthenticated = true;
      setTokens(a.payload.accessToken, a.payload.refreshToken);
      initSocket(a.payload.accessToken);
      AsyncStorage.multiSet([['accessToken', a.payload.accessToken], ['refreshToken', a.payload.refreshToken]]);
    });
    builder.addCase(login.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string; });

    // Initialize
    builder.addCase(initializeAuth.fulfilled, (s, a) => {
      s.isInitialized = true;
      if (a.payload) {
        s.user = a.payload.user;
        s.accessToken = a.payload.accessToken;
        s.isAuthenticated = true;
        initSocket(a.payload.accessToken);
      }
    });
    builder.addCase(initializeAuth.rejected, (s) => { s.isInitialized = true; });

    // Logout
    builder.addCase(logout.fulfilled, (s) => {
      s.user = null;
      s.accessToken = null;
      s.isAuthenticated = false;
    });

    // Update profile
    builder.addCase(updateProfile.fulfilled, (s, a) => { s.user = a.payload; });
  },
});

export const { setUser, updateUserStatus, clearError, setSoundEnabled } = authSlice.actions;
export default authSlice.reducer;

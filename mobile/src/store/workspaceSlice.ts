import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';

interface Workspace {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  owner: any;
  members: any[];
  inviteCode: string;
  plan: 'free' | 'pro' | 'enterprise';
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  activeWorkspace: null,
  isLoading: false,
  error: null,
};

export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const result = await api.workspaces.list();
      return result.workspaces;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const fetchWorkspace = createAsyncThunk(
  'workspace/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await api.workspaces.get(id);
      return result.workspace;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/create',
  async (data: { name: string; description?: string }, { rejectWithValue }) => {
    try {
      const result = await api.workspaces.create(data);
      return result.workspace;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

export const joinWorkspace = createAsyncThunk(
  'workspace/join',
  async (code: string, { rejectWithValue }) => {
    try {
      const result = await api.workspaces.join(code);
      return result.workspace;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setActiveWorkspace(state, action: PayloadAction<Workspace | null>) {
      state.activeWorkspace = action.payload;
    },
    addWorkspace(state, action: PayloadAction<Workspace>) {
      const exists = state.workspaces.find(w => w._id === action.payload._id);
      if (!exists) state.workspaces.push(action.payload);
    },
    updateWorkspace(state, action: PayloadAction<Workspace>) {
      const idx = state.workspaces.findIndex(w => w._id === action.payload._id);
      if (idx > -1) state.workspaces[idx] = action.payload;
      if (state.activeWorkspace?._id === action.payload._id) {
        state.activeWorkspace = action.payload;
      }
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchWorkspaces.pending, (s) => { s.isLoading = true; });
    builder.addCase(fetchWorkspaces.fulfilled, (s, a) => { s.workspaces = a.payload; s.isLoading = false; });
    builder.addCase(fetchWorkspaces.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string; });

    builder.addCase(fetchWorkspace.fulfilled, (s, a) => {
      const idx = s.workspaces.findIndex(w => w._id === a.payload._id);
      if (idx > -1) s.workspaces[idx] = a.payload;
      s.activeWorkspace = a.payload;
    });

    builder.addCase(createWorkspace.pending, (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(createWorkspace.fulfilled, (s, a) => {
      s.isLoading = false;
      s.workspaces.push(a.payload);
      s.activeWorkspace = a.payload;
    });
    builder.addCase(createWorkspace.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string; });

    builder.addCase(joinWorkspace.pending, (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(joinWorkspace.fulfilled, (s, a) => {
      s.isLoading = false;
      s.workspaces.push(a.payload);
      s.activeWorkspace = a.payload;
    });
    builder.addCase(joinWorkspace.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string; });
  },
});

export const { setActiveWorkspace, addWorkspace, updateWorkspace, clearError } = workspaceSlice.actions;
export default workspaceSlice.reducer;

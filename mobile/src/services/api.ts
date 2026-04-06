import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = __DEV__ 
  ? 'http://192.168.1.56:4001/api'
  : 'https://your-production-server.com/api';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export const setTokens = (at: string, rt: string) => {
  accessToken = at;
  refreshToken = rt;
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
};

export const setOnTokenRefreshed = (cb: (token: string) => void) => {
  onTokenRefreshed = cb;
};

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const storedRefresh = refreshToken || await AsyncStorage.getItem('refreshToken');
    if (!storedRefresh) return null;
    
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    
    await AsyncStorage.multiSet([
      ['accessToken', data.accessToken],
      ['refreshToken', data.refreshToken],
    ]);
    
    onTokenRefreshed?.(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
};

const request = async (
  method: string,
  path: string,
  body?: object,
  isRetry = false,
): Promise<any> => {
  const token = accessToken || await AsyncStorage.getItem('accessToken');
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return request(method, path, body, true);
    throw new Error('SESSION_EXPIRED');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: object) => request('POST', path, body),
  put: (path: string, body?: object) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),

  // Auth
  auth: {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    refresh: (rt: string) => request('POST', '/auth/refresh', { refreshToken: rt }, true),
  },

  // Workspaces
  workspaces: {
    list: () => api.get('/workspaces'),
    get: (id: string) => api.get(`/workspaces/${id}`),
    create: (data: any) => api.post('/workspaces', data),
    update: (id: string, data: any) => api.put(`/workspaces/${id}`, data),
    join: (code: string) => api.post(`/workspaces/join/${code}`),
    members: (id: string) => api.get(`/workspaces/${id}/members`),
    regenerateInvite: (id: string) => api.post(`/workspaces/${id}/regenerate-invite`),
  },

  // Channels
  channels: {
    list: (workspaceId: string) => api.get(`/channels/workspace/${workspaceId}`),
    get: (id: string) => api.get(`/channels/${id}`),
    create: (data: any) => api.post('/channels', data),
    update: (id: string, data: any) => api.put(`/channels/${id}`, data),
    join: (id: string) => api.post(`/channels/${id}/join`),
    leave: (id: string) => api.post(`/channels/${id}/leave`),
    markRead: (id: string) => api.put(`/channels/${id}/mark-read`),
    invite: (id: string, userIds: string[]) => api.post(`/channels/${id}/invite`, { userIds }),
    removeMember: (id: string, userId: string) => api.delete(`/channels/${id}/members/${userId}`),
  },

  // Messages
  messages: {
    channel: (channelId: string, before?: string) =>
      api.get(`/messages/channel/${channelId}${before ? `?before=${before}` : ''}`),
    thread: (parentId: string) => api.get(`/messages/thread/${parentId}`),
    send: (data: any) => api.post('/messages', data),
    edit: (id: string, content: string) => api.put(`/messages/${id}`, { content }),
    delete: (id: string) => api.delete(`/messages/${id}`),
    react: (id: string, emoji: string) => api.post(`/messages/${id}/react`, { emoji }),
    pin: (id: string) => api.post(`/messages/${id}/pin`),
  },

  // DMs
  dms: {
    list: (workspaceId: string) => api.get(`/dms?workspaceId=${workspaceId}`),
    create: (data: any) => api.post('/dms', data),
    messages: (dmId: string, before?: string) =>
      api.get(`/dms/${dmId}/messages${before ? `?before=${before}` : ''}`),
    markRead: (dmId: string) => api.put(`/dms/${dmId}/mark-read`),
  },

  // Users
  users: {
    profile: (id: string) => api.get(`/users/profile/${id}`),
    updateProfile: (data: any) => api.put('/users/profile', data),
    changePassword: (data: any) => api.put('/users/password', data),
    search: (q: string, workspaceId: string) =>
      api.get(`/users/search?q=${encodeURIComponent(q)}&workspaceId=${workspaceId}`),
    updateNotifications: (data: any) => api.put('/users/notification-settings', data),
    savePushToken: (token: string) => api.post('/users/push-token', { token }),
  },

  // Files
  files: {
    upload: async (file: { uri: string; name: string; type: string; size?: number }): Promise<any> => {
      const token = accessToken || (await AsyncStorage.getItem('accessToken'));
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);

      const res = await fetch(`${BASE_URL}/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.status === 401 && !token) throw new Error('SESSION_EXPIRED');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },
    delete: (publicId: string, resourceType = 'image') =>
      api.delete(`/files/${encodeURIComponent(publicId)}?resourceType=${resourceType}`),
  },

  // Starred messages
  starred: {
    list: (workspaceId: string) => api.get(`/starred?workspaceId=${workspaceId}`),
    star: (messageId: string, workspaceId: string) => api.post('/starred', { messageId, workspaceId }),
    unstar: (messageId: string) => api.delete(`/starred/${messageId}`),
  },

  // Search
  search: {
    all: (q: string, workspaceId: string, type = 'all') =>
      api.get(`/search?q=${encodeURIComponent(q)}&workspaceId=${workspaceId}&type=${type}`),
  },

  // Notifications
  notifications: {
    list: (page = 1) => api.get(`/notifications?page=${page}`),
    markAllRead: () => api.put('/notifications/mark-all-read'),
    markRead: (id: string) => api.put(`/notifications/${id}/read`),
  },
};

export default api;

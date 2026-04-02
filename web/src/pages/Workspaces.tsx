import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../hooks/useAuth';

interface Workspace {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  owner: {
    displayName: string;
    avatar?: string;
  };
  members: any[];
  inviteCode: string;
}

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces');
      setWorkspaces(res.data.workspaces);
    } catch (err) {
      console.error('Failed to fetch workspaces', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    
    try {
      await api.post('/workspaces', {
        name: newWorkspaceName,
        description: newWorkspaceDesc,
      });
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      setShowCreateForm(false);
      fetchWorkspaces();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create workspace');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    try {
      await api.post(`/workspaces/join/${joinCode.trim().toUpperCase()}`);
      setJoinCode('');
      setShowJoinForm(false);
      fetchWorkspaces();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to join workspace');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-900">Unichat</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.displayName}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Your Workspaces</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinForm(!showJoinForm)}
              className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50"
            >
              Join with Code
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Workspace
            </button>
          </div>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New Workspace</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {showJoinForm && (
          <form onSubmit={handleJoin} className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <h3 className="text-lg font-semibold mb-4">Join Workspace</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter invite code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws) => (
            <div
              key={ws._id}
              onClick={() => navigate(`/chat/${ws._id}`)}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl">{ws.icon || '🚀'}</span>
                <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                  {ws.members.length} members
                </span>
              </div>
              <h3 className="font-semibold text-lg text-gray-800 mb-1">{ws.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{ws.description}</p>
            </div>
          ))}
        </div>

        {workspaces.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👋</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No workspaces yet</h3>
            <p className="text-gray-500 mb-4">Create a workspace or join one with an invite code</p>
          </div>
        )}
      </main>
    </div>
  );
}

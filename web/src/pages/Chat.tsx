import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../hooks/useAuth';
import { io, Socket } from 'socket.io-client';

interface Channel {
  _id: string;
  name: string;
  type: 'public' | 'private';
  description: string;
}

interface Message {
  _id: string;
  content: string;
  channel?: string | { _id: string };
  sender: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  createdAt: string;
  isSystemMessage?: boolean;
}

export default function Chat() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChannelIdRef = useRef<string | null>(null);
  const joinedChannelIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    activeChannelIdRef.current = null;
    joinedChannelIdRef.current = null;
    setChannels([]);
    setActiveChannel(null);
    setMessages([]);

    void fetchWorkspaceData(workspaceId);
    setupSocket(workspaceId);

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      activeChannelIdRef.current = null;
      joinedChannelIdRef.current = null;
    };
  }, [workspaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const setupSocket = (nextWorkspaceId: string) => {
    const socket = io({
      auth: { token: localStorage.getItem('token') },
    });

    socket.on('connect', () => {
      socket.emit('workspace:join', nextWorkspaceId);

      if (joinedChannelIdRef.current) {
        socket.emit('channel:join', joinedChannelIdRef.current);
      }
    });

    socket.on('message:new', (message: Message) => {
      const messageChannelId =
        typeof message.channel === 'string' ? message.channel : message.channel?._id;

      if (messageChannelId && messageChannelId !== activeChannelIdRef.current) {
        return;
      }

      setMessages((prev) => (
        prev.some((existing) => existing._id === message._id)
          ? prev
          : [...prev, message]
      ));
    });

    socketRef.current = socket;
  };

  const fetchWorkspaceData = async (nextWorkspaceId: string) => {
    try {
      const [wsRes, channelsRes] = await Promise.all([
        api.get(`/workspaces/${nextWorkspaceId}`),
        api.get(`/channels/workspace/${nextWorkspaceId}`),
      ]);
      setWorkspaceName(wsRes.data.workspace.name);
      setChannels(channelsRes.data.channels);
      if (channelsRes.data.channels.length > 0) {
        void selectChannel(channelsRes.data.channels[0]);
      }
    } catch (err) {
      console.error('Failed to fetch workspace data', err);
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const res = await api.get(`/messages/channel/${channelId}`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const selectChannel = async (channel: Channel) => {
    const previousChannelId = joinedChannelIdRef.current;

    if (previousChannelId && previousChannelId !== channel._id) {
      socketRef.current?.emit('channel:leave', previousChannelId);
    }

    setActiveChannel(channel);
    activeChannelIdRef.current = channel._id;
    joinedChannelIdRef.current = channel._id;
    setMessages([]);

    socketRef.current?.emit('channel:join', channel._id);

    await fetchMessages(channel._id);
  };

  const handleChannelClick = (channel: Channel) => {
    void selectChannel(channel);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    try {
      await api.post('/messages', {
        content: newMessage,
        channelId: activeChannel._id,
        workspaceId,
      });
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="bg-purple-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workspaces')}
            className="text-white hover:bg-purple-800 px-3 py-1 rounded"
          >
            ← Back
          </button>
          <h1 className="font-semibold">{workspaceName}</h1>
        </div>
        <span className="text-sm opacity-75">{user.displayName}</span>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-gray-50 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-700">Channels</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {channels.map((channel) => (
              <button
                key={channel._id}
                onClick={() => handleChannelClick(channel)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  activeChannel?._id === channel._id
                    ? 'bg-purple-100 text-purple-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                # {channel.name}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {activeChannel ? (
            <>
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold"># {activeChannel.name}</h2>
                <p className="text-sm text-gray-500">{activeChannel.description}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div key={msg._id} className={`flex gap-3 ${msg.isSystemMessage ? 'opacity-60 italic' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-700">
                      {msg.sender.displayName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">{msg.sender.displayName}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-800">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message #${activeChannel.name}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a channel to start chatting
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

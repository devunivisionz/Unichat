import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import { useAppDispatch, useAppSelector } from './redux';
import {
  addMessage, updateMessage, deleteMessage, updateReactions,
  addThreadReply, setTypingUsers, addChannel, addDM, updatePresence,
} from '../store/chatSlice';
import { addNotification } from '../store/notificationSlice';
import { updateUserStatus } from '../store/authSlice';

export const useSocketEvents = (workspaceId: string | null) => {
  const dispatch = useAppDispatch();
  const activeChannelId = useAppSelector(s => s.chat.activeChannelId);
  const activeDMId = useAppSelector(s => s.chat.activeDMId);
  const userId = useAppSelector(s => s.auth.user?._id);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !workspaceId) return;

    const handleNewMessage = (message: any) => {
      if (!mounted.current) return;
      const roomId = message.channel || message.dm;
      if (!message.thread?.parentMessage) {
        dispatch(addMessage({ roomId, message }));
      }
    };

    const handleNewReply = (message: any) => {
      if (!mounted.current) return;
      const parentId = message.thread?.parentMessage;
      if (parentId) dispatch(addThreadReply({ parentId, message }));
    };

    const handleUpdatedMessage = (message: any) => {
      if (!mounted.current) return;
      const roomId = message.channel || message.dm;
      dispatch(updateMessage({ roomId, message }));
    };

    const handleDeletedMessage = ({ messageId }: any) => {
      if (!mounted.current) return;
      const roomId = activeChannelId || activeDMId;
      if (roomId) dispatch(deleteMessage({ roomId, messageId }));
    };

    const handleReaction = ({ messageId, reactions }: any) => {
      if (!mounted.current) return;
      const roomId = activeChannelId || activeDMId;
      if (roomId) dispatch(updateReactions({ roomId, messageId, reactions }));
    };

    const handleTypingUpdate = ({ roomId, roomType, typingUsers, userId: typingUserId, displayName, avatar, action }: any) => {
      if (!mounted.current) return;
      const key = `${roomType}:${roomId}`;
      // We'll rely on the server's typingUsers array
      const currentKey = activeChannelId ? `channel:${activeChannelId}` : activeDMId ? `dm:${activeDMId}` : null;
      if (key === currentKey) {
        dispatch(setTypingUsers({ roomId: key, users: typingUsers.filter((id: string) => id !== userId).map((id: string) => ({ userId: id, displayName, avatar })) }));
      }
    };

    const handlePresenceUpdate = ({ userId: uid, status, statusMessage }: any) => {
      if (!mounted.current) return;
      dispatch(updatePresence({ userId: uid, status }));
      // Also update own status
    };

    const handleChannelCreated = (channel: any) => {
      if (!mounted.current) return;
      dispatch(addChannel(channel));
    };

    const handleDMCreated = (dm: any) => {
      if (!mounted.current) return;
      dispatch(addDM(dm));
    };

    const handleNotification = (notification: any) => {
      if (!mounted.current) return;
      dispatch(addNotification(notification));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:new_reply', handleNewReply);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('message:reaction', handleReaction);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('user:presence_update', handlePresenceUpdate);
    socket.on('channel:created', handleChannelCreated);
    socket.on('dm:created', handleDMCreated);
    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:new_reply', handleNewReply);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('message:reaction', handleReaction);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('user:presence_update', handlePresenceUpdate);
      socket.off('channel:created', handleChannelCreated);
      socket.off('dm:created', handleDMCreated);
      socket.off('notification:new', handleNotification);
    };
  }, [workspaceId, activeChannelId, activeDMId]);
};

import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getSocket } from '../services/socket';
import { soundService } from '../utils/SoundService';
import { useAppDispatch, useAppSelector } from './redux';
import {
  addMessage, updateMessage, deleteMessage, updateReactions,
  addThreadReply, setTypingUsers, addChannel, addDM, updatePresence,
  removeChannel, removeDM,
} from '../store/chatSlice';
import { addNotification } from '../store/notificationSlice';
import { updateUserStatus } from '../store/authSlice';

export const useSocketEvents = () => {
  const dispatch = useAppDispatch();
  const activeWorkspaceId = useAppSelector(s => s.chat.activeWorkspaceId);
  const activeChannelId = useAppSelector(s => s.chat.activeChannelId);
  const activeDMId = useAppSelector(s => s.chat.activeDMId);
  const userId = useAppSelector(s => s.auth.user?._id);
  const soundEnabled = useAppSelector(s => s.auth.soundEnabled);
  const mounted = useRef(true);
  const soundEnabledRef = useRef(soundEnabled);
  const userIdRef = useRef(userId);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    soundService.load();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    // We allow events even without activeWorkspaceId for diagnostic visibility,
    // though we still mostly care about messages in the current workspace.
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      if (!mounted.current) return;
      const roomId = message.channel || message.dm;
      
      // DIAGNOSTIC ALERT: Prove the socket is working
      Alert.alert('DEBUG: Socket Event', `Received message in ${roomId} from ${message.sender.displayName || message.sender}`);
      console.log(`Socket: Received new message from ${message.sender._id || message.sender} in ${roomId}`);
      
      if (!message.thread?.parentMessage) {
        dispatch(addMessage({ roomId, message }));
        
        const senderId = message.sender._id || message.sender;
        const currentUserId = userIdRef.current;
        const soundEnabled = soundEnabledRef.current;
        
        console.log(`Sound Check: enabled=${soundEnabled}, isMe=${String(senderId) === String(currentUserId)}`);
        
        if (soundEnabled && String(senderId) !== String(currentUserId)) {
          console.log('Socket: Playing notification sound for new message');
          soundService.playNotification();
        } else {
          console.log(`Socket: Skipping sound (enabled: ${soundEnabled}, isMe: ${String(senderId) === String(currentUserId)})`);
        }
      }
    };

    const handleNewReply = (message: any) => {
      if (!mounted.current) return;
      const parentId = message.thread?.parentMessage;
      console.log(`Socket: Received new reply from ${message.sender._id || message.sender} for parent ${parentId}`);
      if (parentId) {
        dispatch(addThreadReply({ parentId, message }));
        
        const senderId = message.sender._id || message.sender;
        const currentUserId = userIdRef.current;
        
        if (soundEnabledRef.current && String(senderId) !== String(currentUserId)) {
          console.log('Socket: Playing notification sound for new reply');
          soundService.playNotification();
        }
      }
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
      console.log(`Socket: Received new notification of type ${notification.type}`);
      dispatch(addNotification(notification));
      if (soundEnabledRef.current) {
        console.log('Socket: Playing notification sound for notification');
        soundService.playNotification();
      }
    };

    const handleChannelRemoved = ({ channelId }: any) => {
      if (!mounted.current) return;
      dispatch(removeChannel(channelId));
      if (activeChannelId === channelId) {
        Alert.alert('Channel Removed', 'You have been removed from this channel.');
        router.replace(`/(app)/workspaces` as any);
      }
    };

    const handleDMRemoved = ({ dmId }: any) => {
      if (!mounted.current) return;
      dispatch(removeDM(dmId));
      if (activeDMId === dmId) {
        Alert.alert('Chat Removed', 'This chat is no longer available.');
        router.replace(`/(app)/workspaces` as any);
      }
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
    socket.on('channel:removed', handleChannelRemoved);
    socket.on('dm:removed', handleDMRemoved);

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
      socket.off('channel:removed', handleChannelRemoved);
      socket.off('dm:removed', handleDMRemoved);
    };
  }, [activeWorkspaceId, activeChannelId, activeDMId]);
};

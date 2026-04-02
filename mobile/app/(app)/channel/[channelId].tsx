import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../../src/hooks/redux';
import { fetchChannelMessages, sendMessage, markChannelRead } from '../../../src/store/chatSlice';
import { joinChannel, leaveChannel, startTyping, stopTyping } from '../../../src/services/socket';
import MessageBubble from '../../../src/components/MessageBubble';
import TypingIndicator from '../../../src/components/TypingIndicator';
import AttachmentPicker from '../../../src/components/AttachmentPicker';
import { api } from '../../../src/services/api';

const EMPTY_MESSAGES: any[] = [];
const EMPTY_TYPING_USERS: any[] = [];

export default function ChannelScreen() {
  const { channelId, workspaceId } = useLocalSearchParams<{ channelId: string; workspaceId: string }>();
  const channelKey = Array.isArray(channelId) ? (channelId[0] ?? '') : (channelId ?? '');
  const workspaceKey = Array.isArray(workspaceId) ? (workspaceId[0] ?? '') : (workspaceId ?? '');
  const dispatch = useAppDispatch();
  const messages = useAppSelector(s => s.chat.messages[channelKey] ?? EMPTY_MESSAGES);
  const hasMore = useAppSelector(s => s.chat.hasMore[channelKey] ?? false);
  const isLoading = useAppSelector(s => s.chat.isLoadingMessages);
  const channels = useAppSelector(s => s.chat.channels);
  const typingUsers = useAppSelector(s => s.chat.typingUsers[`channel:${channelKey}`] ?? EMPTY_TYPING_USERS);
  const me = useAppSelector(s => s.auth.user);
  const channel = channels.find(c => c._id === channelKey);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);

  useEffect(() => {
    if (!channelKey) return;
    joinChannel(channelKey);
    dispatch(fetchChannelMessages({ channelId: channelKey }));
    dispatch(markChannelRead(channelKey));
    return () => {
      leaveChannel(channelKey);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [channelKey, dispatch]);

  const handleSend = async () => {
    if ((!inputText.trim() && !pendingAttachment) || isSending || !channelKey || !workspaceKey) return;
    const content = inputText.trim();
    setInputText('');
    const attachment = pendingAttachment;
    setPendingAttachment(null);
    setReplyingTo(null);
    setIsSending(true);
    stopTyping('channel', channelKey);

    try {
      await dispatch(sendMessage({
        workspaceId: workspaceKey, channelId: channelKey, content,
        attachments: attachment ? [attachment] : [],
        ...(replyingTo ? { parentMessageId: replyingTo._id } : {}),
      }));
    } catch {
      setInputText(content);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!channelKey) return;
    startTyping('channel', channelKey);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => stopTyping('channel', channelKey), 3000);
  };

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !channelKey || messages.length === 0) return;
    setIsLoadingMore(true);
    const oldest = messages[0]?.createdAt;
    if (oldest) await dispatch(fetchChannelMessages({ channelId: channelKey, before: oldest }));
    setIsLoadingMore(false);
  }, [channelKey, dispatch, hasMore, isLoadingMore, messages]);

  const handleReaction = (message: any, emoji: string) => {
    api.messages.react(message._id, emoji).catch(() => {});
  };

  const handleStar = async (message: any) => {
    if (!workspaceKey) return;
    try {
      await api.starred.star(message._id, workspaceKey);
      Alert.alert('Saved', 'Message added to Saved Items');
    } catch (e: any) {
      if (e.message?.includes('Already')) Alert.alert('Already saved', 'This message is already in your saved items.');
    }
  };

  const handleOpenThread = (message: any) => {
    router.push(`/(app)/thread/${message._id}?workspaceId=${workspaceKey}&channelId=${channelKey}`);
  };

  const handleLongPress = (message: any) => {
    const isMine = message.sender._id === me?._id;
    const actions: any[] = [];

    actions.push({ text: 'React', onPress: () => {} });
    actions.push({ text: 'Reply in Thread', onPress: () => handleOpenThread(message) });
    actions.push({ text: 'Save Message', onPress: () => handleStar(message) });

    if (isMine) {
      actions.push({
        text: 'Edit', onPress: () => {
          Alert.prompt?.('Edit message', '', async (newContent) => {
            if (newContent?.trim()) {
              await api.messages.edit(message._id, newContent.trim()).catch(() => {});
            }
          }, 'plain-text', message.content);
        }
      });
      actions.push({
        text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Delete message?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await api.messages.delete(message._id).catch(() => {}); } },
          ]);
        }
      });
    }
    actions.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message Actions', '', actions);
  };

  const canSend = (inputText.trim().length > 0 || !!pendingAttachment) && !isSending;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.channelBadge}>
            <Ionicons name="pricetag" size={14} color="white" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.channelName}>{channel?.name || 'Channel'}</Text>
            {channel?.description ? (
              <Text style={styles.channelDesc} numberOfLines={1}>{channel.description}</Text>
            ) : (
              <Text style={styles.memberCount}>{channel?.members?.length || 0} members</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/(app)/starred/${workspaceKey}`)}>
              <Ionicons name="star-outline" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/(app)/search/${workspaceKey}`)}>
              <Ionicons name="search" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="people-outline" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView} keyboardVerticalOffset={0}>
          {isLoading && messages.length === 0 ? (
            <ActivityIndicator color={Colors.primary} style={{ flex: 1, alignSelf: 'center' }} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => m._id}
              renderItem={({ item, index }) => {
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showAvatar = !prevMsg || prevMsg.sender._id !== item.sender._id ||
                  (new Date(item.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 300000;
                return (
                  <MessageBubble
                    message={item}
                    isMe={item.sender._id === me?._id}
                    showAvatar={showAvatar}
                    onReact={handleReaction}
                    onOpenThread={handleOpenThread}
                    onLongPress={handleLongPress}
                    onReply={setReplyingTo}
                    onStar={handleStar}
                    onNavigateToProfile={(uid) => router.push(`/(app)/profile/${uid}`)}
                  />
                );
              }}
              onStartReachedThreshold={0.3}
              onStartReached={handleLoadMore}
              ListHeaderComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} /> : null}
              ListFooterComponent={<View style={{ height: 8 }} />}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            />
          )}

          {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

          {/* Reply preview */}
          {replyingTo && (
            <View style={styles.replyPreview}>
              <Ionicons name="return-down-forward" size={16} color={Colors.primary} />
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                Replying to <Text style={styles.replyPreviewUser}>{replyingTo.sender.displayName}</Text>: {replyingTo.content}
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close" size={18} color={Colors.outline} />
              </TouchableOpacity>
            </View>
          )}

          {/* Attachment preview */}
          {pendingAttachment && (
            <View style={styles.attachPreview}>
              <Ionicons name={pendingAttachment.type === 'image' ? 'image' : pendingAttachment.type === 'video' ? 'videocam' : 'document-attach'} size={16} color={Colors.primary} />
              <Text style={styles.attachPreviewName} numberOfLines={1}>{pendingAttachment.name}</Text>
              <TouchableOpacity onPress={() => setPendingAttachment(null)}>
                <Ionicons name="close" size={18} color={Colors.outline} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.inputAction} onPress={() => setShowAttachPicker(true)}>
                <Ionicons name="add-circle" size={28} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputAction}>
                <Ionicons name="happy-outline" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder={`Message #${channel?.name || 'channel'}`}
                placeholderTextColor={Colors.outline}
                value={inputText}
                onChangeText={handleTyping}
                multiline
                maxLength={4000}
              />
              <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={handleSend} disabled={!canSend}>
                {isSending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={18} color="white" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AttachmentPicker
        visible={showAttachPicker}
        onClose={() => setShowAttachPicker(false)}
        onAttachmentReady={(att) => { setPendingAttachment(att); setShowAttachPicker(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow, gap: 8 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  channelBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1 },
  channelName: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  channelDesc: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  memberCount: { fontSize: 11, color: Colors.onSurfaceVariant },
  headerActions: { flexDirection: 'row', gap: 2 },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { flex: 1 },
  messageList: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  inputBar: { backgroundColor: Colors.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerLow, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl, paddingRight: 8, paddingLeft: 4 },
  inputAction: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: 15, color: Colors.onSurface, maxHeight: 120, paddingVertical: 10, paddingHorizontal: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  sendBtnDisabled: { backgroundColor: Colors.outline },
  replyPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh },
  replyPreviewText: { flex: 1, fontSize: 13, color: Colors.onSurfaceVariant },
  replyPreviewUser: { fontWeight: '700', color: Colors.primary },
  attachPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${Colors.primary}10`, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh },
  attachPreviewName: { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: '500' },
});

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../../src/hooks/redux';
import { fetchDMMessages, sendMessage, markDMRead, setActiveWorkspace } from '../../../src/store/chatSlice';
import { joinDM, leaveDM, startTyping, stopTyping } from '../../../src/services/socket';
import MessageBubble from '../../../src/components/MessageBubble';
import TypingIndicator from '../../../src/components/TypingIndicator';
import AttachmentPicker from '../../../src/components/AttachmentPicker';
import { api } from '../../../src/services/api';

const EMPTY_MESSAGES: any[] = [];
const EMPTY_TYPING_USERS: any[] = [];

export default function DMScreen() {
  const { dmId, workspaceId } = useLocalSearchParams<{ dmId: string; workspaceId: string }>();
  const dmKey = Array.isArray(dmId) ? (dmId[0] ?? '') : (dmId ?? '');
  const workspaceKey = Array.isArray(workspaceId) ? (workspaceId[0] ?? '') : (workspaceId ?? '');
  const dispatch = useAppDispatch();
  const messages = useAppSelector(s => s.chat.messages[dmKey] ?? EMPTY_MESSAGES);
  const hasMore = useAppSelector(s => s.chat.hasMore[dmKey] ?? false);
  const isLoading = useAppSelector(s => s.chat.isLoadingMessages);
  const dms = useAppSelector(s => s.chat.dms);
  const typingUsers = useAppSelector(s => s.chat.typingUsers[`dm:${dmKey}`] ?? EMPTY_TYPING_USERS);
  const me = useAppSelector(s => s.auth.user);
  const dm = dms.find(d => d._id === dmKey);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);

  const otherUser = !dm?.isGroup ? dm?.participants?.find((p: any) => p._id !== me?._id) : null;
  const dmName = dm?.isGroup ? (dm.groupName || 'Group DM') : (otherUser?.displayName || 'Direct Message');
  const statusColors: any = { online: Colors.statusOnline, away: Colors.statusAway, busy: Colors.statusBusy };

  useEffect(() => {
    if (!dmKey) return;
    if (workspaceKey) dispatch(setActiveWorkspace(workspaceKey));
    joinDM(dmKey);
    dispatch(fetchDMMessages({ dmId: dmKey }));
    dispatch(markDMRead(dmKey));
    return () => { leaveDM(dmKey); if (typingTimeout.current) clearTimeout(typingTimeout.current); };
  }, [dispatch, dmKey, workspaceKey]);

  const handleSend = async () => {
    if ((!inputText.trim() && !pendingAttachment) || isSending || !dmKey || !workspaceKey) return;
    const content = inputText.trim();
    const attachment = pendingAttachment;
    setInputText(''); setPendingAttachment(null); setIsSending(true);
    stopTyping('dm', dmKey);
    try {
      await dispatch(sendMessage({ workspaceId: workspaceKey, dmId: dmKey, content, attachments: attachment ? [attachment] : [] }));
    } catch { setInputText(content); }
    finally { setIsSending(false); }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!dmKey) return;
    startTyping('dm', dmKey);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => stopTyping('dm', dmKey), 3000);
  };

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !dmKey || messages.length === 0) return;
    setIsLoadingMore(true);
    const oldest = messages[0]?.createdAt;
    if (oldest) await dispatch(fetchDMMessages({ dmId: dmKey, before: oldest }));
    setIsLoadingMore(false);
  }, [dispatch, dmKey, hasMore, isLoadingMore, messages]);

  const handleStar = async (message: any) => {
    if (!workspaceKey) return;
    try { await api.starred.star(message._id, workspaceKey); Alert.alert('Saved', 'Message saved'); }
    catch (e: any) { if (e.message?.includes('Already')) Alert.alert('Already saved', 'Already in saved items.'); }
  };

  const canSend = (inputText.trim().length > 0 || !!pendingAttachment) && !isSending;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={Colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.headerAvatar} onPress={() => otherUser && router.push(`/(app)/profile/${otherUser._id}`)}>
            {otherUser?.avatar ? (
              <Image source={{ uri: otherUser.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.headerAvatarText}>{dmName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
            )}
            {!dm?.isGroup && otherUser && <View style={[styles.onlineDot, { backgroundColor: statusColors[otherUser.status] || Colors.statusOffline }]} />}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.dmName}>{dmName}</Text>
            {!dm?.isGroup && otherUser && <Text style={styles.dmStatus}>{otherUser.status || 'offline'}</Text>}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="call-outline" size={20} color={Colors.onSurfaceVariant} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="videocam-outline" size={20} color={Colors.onSurfaceVariant} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => workspaceKey && router.push(`/(app)/starred/${workspaceKey}`)}>
              <Ionicons name="star-outline" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          {isLoading && messages.length === 0 ? (
            <ActivityIndicator color={Colors.primary} style={{ flex: 1, alignSelf: 'center' }} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => m._id}
              renderItem={({ item, index }) => {
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showAvatar = !prevMsg || prevMsg.sender._id !== item.sender._id || (new Date(item.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 300000;
                return (
                  <MessageBubble
                    message={item} isMe={item.sender._id === me?._id} showAvatar={showAvatar}
                    onReact={(msg, emoji) => api.messages.react(msg._id, emoji).catch(() => {})}
                    onOpenThread={(msg) => router.push(`/(app)/thread/${msg._id}?workspaceId=${workspaceKey}`)}
                    onLongPress={() => {}} onReply={() => {}}
                    onStar={handleStar}
                    onNavigateToProfile={(uid) => router.push(`/(app)/profile/${uid}`)}
                  />
                );
              }}
              onStartReachedThreshold={0.3} onStartReached={handleLoadMore}
              ListHeaderComponent={isLoadingMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} /> : null}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}
          {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
          {pendingAttachment && (
            <View style={styles.attachPreview}>
              <Ionicons name={pendingAttachment.type === 'image' ? 'image' : pendingAttachment.type === 'video' ? 'videocam' : 'document-attach'} size={16} color={Colors.primary} />
              <Text style={styles.attachPreviewName} numberOfLines={1}>{pendingAttachment.name}</Text>
              <TouchableOpacity onPress={() => setPendingAttachment(null)}><Ionicons name="close" size={18} color={Colors.outline} /></TouchableOpacity>
            </View>
          )}
          <View style={styles.inputBar}>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.inputAction} onPress={() => setShowAttachPicker(true)}><Ionicons name="add-circle" size={28} color={Colors.onSurfaceVariant} /></TouchableOpacity>
              <TouchableOpacity style={styles.inputAction}><Ionicons name="happy-outline" size={24} color={Colors.onSurfaceVariant} /></TouchableOpacity>
              <TextInput style={styles.input} placeholder={`Message ${dmName}`} placeholderTextColor={Colors.outline} value={inputText} onChangeText={handleTyping} multiline maxLength={4000} />
              <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={handleSend} disabled={!canSend}>
                {isSending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={18} color="white" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <AttachmentPicker visible={showAttachPicker} onClose={() => setShowAttachPicker(false)} onAttachmentReady={(att) => { setPendingAttachment(att); setShowAttachPicker(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface }, safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow, gap: 8 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  headerAvatarText: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.surfaceContainerLowest },
  headerInfo: { flex: 1 }, dmName: { fontSize: 16, fontWeight: '700', color: Colors.primary }, dmStatus: { fontSize: 11, color: Colors.onSurfaceVariant, textTransform: 'capitalize' },
  headerActions: { flexDirection: 'row', gap: 2 }, iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { flex: 1 }, messageList: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  inputBar: { backgroundColor: Colors.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerLow, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl, paddingRight: 8, paddingLeft: 4 },
  inputAction: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: 15, color: Colors.onSurface, maxHeight: 120, paddingVertical: 10, paddingHorizontal: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  sendBtnDisabled: { backgroundColor: Colors.outline },
  attachPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${Colors.primary}10`, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh },
  attachPreviewName: { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: '500' },
});

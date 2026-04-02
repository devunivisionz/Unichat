import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../../src/hooks/redux';
import { fetchThreadMessages, sendMessage } from '../../../src/store/chatSlice';
import { joinThread, leaveThread } from '../../../src/services/socket';
import MessageBubble from '../../../src/components/MessageBubble';
import AttachmentPicker from '../../../src/components/AttachmentPicker';
import { api } from '../../../src/services/api';

const EMPTY_MESSAGES: any[] = [];
const EMPTY_REPLIES: any[] = [];

export default function ThreadScreen() {
  const { messageId, workspaceId, channelId } = useLocalSearchParams<{ messageId: string; workspaceId: string; channelId: string }>();
  const messageKey = Array.isArray(messageId) ? (messageId[0] ?? '') : (messageId ?? '');
  const workspaceKey = Array.isArray(workspaceId) ? (workspaceId[0] ?? '') : (workspaceId ?? '');
  const channelKey = Array.isArray(channelId) ? (channelId[0] ?? '') : (channelId ?? '');
  const dispatch = useAppDispatch();
  const replies = useAppSelector(s => s.chat.threadMessages[messageKey] ?? EMPTY_REPLIES);
  const messages = useAppSelector(s => s.chat.messages[channelKey] ?? EMPTY_MESSAGES);
  const parentMessage = messages.find(m => m._id === messageKey);
  const me = useAppSelector(s => s.auth.user);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!messageKey) return;
    joinThread(messageKey);
    dispatch(fetchThreadMessages(messageKey));
    return () => leaveThread(messageKey);
  }, [dispatch, messageKey]);

  const handleSend = async () => {
    if ((!inputText.trim() && !pendingAttachment) || isSending || !messageKey || !workspaceKey) return;
    const content = inputText.trim();
    const attachment = pendingAttachment;
    setInputText('');
    setPendingAttachment(null);
    setIsSending(true);
    try {
      await dispatch(sendMessage({
        workspaceId: workspaceKey, channelId: channelKey, content,
        parentMessageId: messageKey,
        attachments: attachment ? [attachment] : [],
      }));
    } finally {
      setIsSending(false);
    }
  };

  const canSend = (inputText.trim().length > 0 || !!pendingAttachment) && !isSending;

  const handleStar = async (message: any) => {
    if (!workspaceKey) return;
    try {
      await api.starred.star(message._id, workspaceKey);
      Alert.alert('Saved', 'Message added to Saved Items');
    } catch {}
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Thread</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/(app)/starred/${workspaceKey}`)}>
              <Ionicons name="star-outline" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <FlatList
            ref={flatListRef}
            data={[
              ...(parentMessage ? [{ ...parentMessage, isParent: true }] : []),
              { _id: 'divider', isDivider: true, replyCount: replies.length } as any,
              ...replies,
            ]}
            keyExtractor={item => item._id}
            renderItem={({ item }) => {
              if (item.isDivider) {
                return (
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{item.replyCount} {item.replyCount === 1 ? 'Reply' : 'Replies'}</Text>
                    <View style={styles.dividerLine} />
                  </View>
                );
              }
              return (
                <MessageBubble
                  message={item}
                  isMe={item.sender?._id === me?._id}
                  showAvatar={true}
                  onReact={(msg, emoji) => api.messages.react(msg._id, emoji).catch(() => {})}
                  onOpenThread={() => {}}
                  onLongPress={() => {}}
                  onReply={() => {}}
                  onStar={handleStar}
                  onNavigateToProfile={(uid) => router.push(`/(app)/profile/${uid}`)}
                />
              );
            }}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={<View style={{ height: 8 }} />}
          />

          {pendingAttachment && (
            <View style={styles.attachPreview}>
              <Ionicons name="document-attach" size={16} color={Colors.primary} />
              <Text style={styles.attachPreviewName} numberOfLines={1}>{pendingAttachment.name}</Text>
              <TouchableOpacity onPress={() => setPendingAttachment(null)}>
                <Ionicons name="close" size={18} color={Colors.outline} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBar}>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.inputAction} onPress={() => setShowAttachPicker(true)}>
                <Ionicons name="add-circle" size={26} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Reply to thread..."
                placeholderTextColor={Colors.outline}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={4000}
              />
              <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={handleSend} disabled={!canSend}>
                {isSending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={16} color="white" />}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.primary, marginLeft: 4 },
  headerActions: { flexDirection: 'row' },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { flex: 1 },
  messageList: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceContainerHigh },
  dividerText: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1, textTransform: 'uppercase' },
  attachPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${Colors.primary}10`, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh },
  attachPreviewName: { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: '500' },
  inputBar: { backgroundColor: Colors.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerLow, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl, paddingRight: 8, paddingLeft: 8 },
  inputAction: { width: 36, height: 44, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: 14, color: Colors.onSurface, maxHeight: 120, paddingVertical: 10 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  sendBtnDisabled: { backgroundColor: Colors.outline },
});

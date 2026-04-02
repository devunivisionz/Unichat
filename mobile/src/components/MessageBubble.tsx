import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { Colors, Spacing, BorderRadius } from '../utils/theme';
import MediaViewer from './MediaViewer';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🚀', '🎉', '👀'];

function formatTime(dateString: string) {
  const d = new Date(dateString);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

function renderContent(content: string) {
  const parts = content.split(/(@\w+|#\w+|`[^`]+`|\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) return <Text key={i} style={styles.mention}>{part}</Text>;
    if (part.startsWith('#')) return <Text key={i} style={styles.channelRef}>{part}</Text>;
    if (part.startsWith('`') && part.endsWith('`')) return <Text key={i} style={styles.code}>{part.slice(1, -1)}</Text>;
    if (part.startsWith('**') && part.endsWith('**')) return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('_') && part.endsWith('_')) return <Text key={i} style={styles.italic}>{part.slice(1, -1)}</Text>;
    return <Text key={i}>{part}</Text>;
  });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith('audio/')) return 'musical-notes';
  if (mimeType?.includes('pdf')) return 'document-text';
  if (mimeType?.includes('sheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return 'grid';
  if (mimeType?.includes('word') || mimeType?.includes('doc')) return 'document';
  if (mimeType?.includes('zip') || mimeType?.includes('archive')) return 'archive';
  return 'document-attach';
}

interface Props {
  message: any;
  isMe: boolean;
  showAvatar: boolean;
  onReact: (message: any, emoji: string) => void;
  onOpenThread: (message: any) => void;
  onLongPress: (message: any) => void;
  onReply: (message: any) => void;
  onStar?: (message: any) => void;
  onNavigateToProfile?: (userId: string) => void;
}

export default function MessageBubble({ message, isMe, showAvatar, onReact, onOpenThread, onLongPress, onReply, onStar, onNavigateToProfile }: Props) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ uri: string; type: 'image' | 'video'; name?: string } | null>(null);

  if (message.isDeleted) {
    return (
      <View style={[styles.wrapper, !showAvatar && styles.wrapperContinuation]}>
        <View style={styles.row}>
          {!isMe && <View style={styles.avatarSpace} />}
          <View style={styles.deletedBubble}>
            <Ionicons name="close-circle-outline" size={14} color={Colors.outline} />
            <Text style={styles.deletedText}>Message deleted</Text>
          </View>
        </View>
      </View>
    );
  }

  if (message.isSystemMessage) {
    return (
      <View style={styles.systemMessage}>
        <View style={styles.systemDivider} />
        <Text style={styles.systemText}>{message.content}</Text>
        <View style={styles.systemDivider} />
      </View>
    );
  }

  const initials = message.sender.displayName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const renderAttachment = (att: any, i: number) => {
    if (att.type === 'image') {
      return (
        <TouchableOpacity key={i} onPress={() => setMediaViewer({ uri: att.url, type: 'image', name: att.name })} activeOpacity={0.9} style={styles.attachment}>
          <Image source={{ uri: att.url }} style={styles.attachmentImage} resizeMode="cover" />
          {att.name ? <View style={styles.imageCaption}><Text style={styles.imageCaptionText} numberOfLines={1}>{att.name}</Text></View> : null}
        </TouchableOpacity>
      );
    }
    if (att.type === 'video') {
      return (
        <TouchableOpacity key={i} onPress={() => setMediaViewer({ uri: att.thumbnail || att.url, type: 'video', name: att.name })} activeOpacity={0.9} style={styles.attachment}>
          <View style={styles.videoThumb}>
            {att.thumbnail ? <Image source={{ uri: att.thumbnail }} style={styles.attachmentImage} resizeMode="cover" /> : <View style={[styles.attachmentImage, styles.videoPlaceholder]}><Ionicons name="videocam" size={40} color={Colors.outline} /></View>}
            <View style={styles.playOverlay}><View style={styles.playBtn}><Ionicons name="play" size={22} color="white" /></View></View>
            {att.duration ? <View style={styles.durationBadge}><Text style={styles.durationText}>{Math.floor(att.duration / 60)}:{String(Math.round(att.duration % 60)).padStart(2, '0')}</Text></View> : null}
          </View>
        </TouchableOpacity>
      );
    }
    if (att.type === 'audio') {
      return (
        <View key={i} style={[styles.attachment, styles.audioAttachment]}>
          <View style={styles.audioIcon}><Ionicons name="musical-notes" size={22} color={Colors.primary} /></View>
          <View style={styles.audioInfo}><Text style={styles.audioName} numberOfLines={1}>{att.name || 'Audio'}</Text><Text style={styles.audioSize}>{formatFileSize(att.size)}</Text></View>
          <TouchableOpacity style={styles.audioPlayBtn}><Ionicons name="play-circle" size={36} color={Colors.primary} /></TouchableOpacity>
        </View>
      );
    }
    return (
      <View key={i} style={[styles.attachment, styles.fileAttachment]}>
        <View style={styles.fileIcon}><Ionicons name={getFileIcon(att.mimeType) as any} size={22} color={Colors.primary} /></View>
        <View style={styles.fileInfo}><Text style={styles.fileName} numberOfLines={1}>{att.name || 'File'}</Text><Text style={styles.fileSize}>{att.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'} · {formatFileSize(att.size)}</Text></View>
        <TouchableOpacity style={styles.downloadBtn}><Ionicons name="download-outline" size={20} color={Colors.onSurfaceVariant} /></TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.wrapper, !showAvatar && styles.wrapperContinuation]}>
      <TouchableWithoutFeedback onLongPress={() => { setShowEmojiPicker(false); onLongPress(message); }}>
        <View style={styles.row}>
          {showAvatar ? (
            <TouchableOpacity style={styles.avatar} onPress={() => onNavigateToProfile?.(message.sender._id)} activeOpacity={0.7}>
              {message.sender.avatar ? <Image source={{ uri: message.sender.avatar }} style={styles.avatarImg} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials}</Text></View>}
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarSpace} />
          )}
          <View style={styles.content}>
            {showAvatar && (
              <View style={styles.meta}>
                <TouchableOpacity onPress={() => onNavigateToProfile?.(message.sender._id)}>
                  <Text style={styles.senderName}>{message.sender.displayName}</Text>
                </TouchableOpacity>
                <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
                {message.isEdited && <Text style={styles.editedTag}>(edited)</Text>}
                {message.isPinned && <View style={styles.pinBadge}><Ionicons name="pin" size={10} color={Colors.secondary} /></View>}
              </View>
            )}
            {message.content ? <View style={styles.textWrap}><Text style={styles.messageText}>{renderContent(message.content)}</Text></View> : null}
            {message.attachments?.map(renderAttachment)}
            {message.reactions?.length > 0 && (
              <View style={styles.reactions}>
                {message.reactions.filter((r: any) => r.count > 0).map((r: any, i: number) => (
                  <TouchableOpacity key={i} style={styles.reaction} onPress={() => onReact(message, r.emoji)}>
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    <Text style={styles.reactionCount}>{r.count}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addReactionBtn} onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <Ionicons name="add" size={14} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            )}
            {message.thread?.replyCount > 0 && (
              <TouchableOpacity style={styles.threadPreview} onPress={() => onOpenThread(message)}>
                <View style={styles.threadAvatars}>
                  {message.thread.participants?.slice(0, 3).map((p: any, i: number) => (
                    <View key={i} style={[styles.threadAvatar, { left: i * 16 }]}>
                      {p.avatar ? <Image source={{ uri: p.avatar }} style={styles.threadAvatarImg} /> : <View style={styles.threadAvatarFallback}><Text style={styles.threadAvatarText}>{p.displayName?.[0] || '?'}</Text></View>}
                    </View>
                  ))}
                </View>
                <View style={{ marginLeft: (Math.min(message.thread.participants?.length || 0, 3) * 16) + 8 }}>
                  <Text style={styles.threadReplies}><Text style={styles.threadRepliesCount}>{message.thread.replyCount} {message.thread.replyCount === 1 ? 'reply' : 'replies'}</Text></Text>
                  {message.thread.lastReplyAt && <Text style={styles.threadLastReply}>Last reply {formatTime(message.thread.lastReplyAt)}</Text>}
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>

      {showEmojiPicker && (
        <View style={styles.emojiPicker}>
          {COMMON_EMOJIS.map(emoji => (
            <TouchableOpacity key={emoji} style={styles.emojiOption} onPress={() => { onReact(message, emoji); setShowEmojiPicker(false); }}>
              <Text style={styles.emojiOptionText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.emojiOption} onPress={() => { onReply(message); setShowEmojiPicker(false); }}>
            <Ionicons name="return-down-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>
          {onStar && (
            <TouchableOpacity style={styles.emojiOption} onPress={() => { onStar(message); setShowEmojiPicker(false); }}>
              <Ionicons name="star-outline" size={18} color="#f59e0b" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {mediaViewer && (
        <MediaViewer visible={!!mediaViewer} uri={mediaViewer.uri} type={mediaViewer.type} name={mediaViewer.name} onClose={() => setMediaViewer(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 2 },
  wrapperContinuation: { marginBottom: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 3 },
  avatar: { width: 36, height: 36, marginTop: 2, flexShrink: 0 },
  avatarImg: { width: 36, height: 36, borderRadius: 10 },
  avatarFallback: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant },
  avatarSpace: { width: 36, flexShrink: 0 },
  content: { flex: 1, maxWidth: '87%' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  senderName: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  time: { fontSize: 11, color: Colors.outline },
  editedTag: { fontSize: 10, color: Colors.outline, fontStyle: 'italic' },
  pinBadge: { backgroundColor: `${Colors.secondary}20`, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  textWrap: {},
  messageText: { fontSize: 15, color: Colors.onSurface, lineHeight: 22 },
  mention: { color: Colors.secondary, fontWeight: '600' },
  channelRef: { color: Colors.primary, fontWeight: '600' },
  code: { fontFamily: 'monospace', fontSize: 13, backgroundColor: Colors.surfaceContainerHigh, color: Colors.error, paddingHorizontal: 4, borderRadius: 4 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  attachment: { marginTop: 6 },
  attachmentImage: { width: '100%', maxHeight: 280, borderRadius: BorderRadius.lg },
  imageCaption: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', borderBottomLeftRadius: BorderRadius.lg, borderBottomRightRadius: BorderRadius.lg, paddingHorizontal: 8, paddingVertical: 4 },
  imageCaptionText: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  videoThumb: { position: 'relative' },
  videoPlaceholder: { backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', height: 200 },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  durationBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  durationText: { fontSize: 11, fontWeight: '600', color: 'white' },
  audioAttachment: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.outlineVariant },
  audioIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: `${Colors.primary}15`, justifyContent: 'center', alignItems: 'center' },
  audioInfo: { flex: 1 },
  audioName: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  audioSize: { fontSize: 12, color: Colors.onSurfaceVariant },
  audioPlayBtn: {},
  fileAttachment: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.outlineVariant },
  fileIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: `${Colors.primary}15`, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  fileSize: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  downloadBtn: { padding: 4 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.outlineVariant },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  addReactionBtn: { backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.full, padding: 4, borderWidth: 1, borderColor: Colors.outlineVariant },
  threadPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.outlineVariant },
  threadAvatars: { flexDirection: 'row', position: 'relative', height: 20, width: 20 },
  threadAvatar: { position: 'absolute', width: 20, height: 20 },
  threadAvatarImg: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: 'white' },
  threadAvatarFallback: { width: 20, height: 20, borderRadius: 6, backgroundColor: Colors.surfaceContainer, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white' },
  threadAvatarText: { fontSize: 8, fontWeight: '700', color: Colors.onSurfaceVariant },
  threadReplies: { fontSize: 12, color: Colors.secondary },
  threadRepliesCount: { fontWeight: '700' },
  threadLastReply: { fontSize: 11, color: Colors.onSurfaceVariant },
  deletedBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg, padding: 8, paddingHorizontal: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.outlineVariant },
  deletedText: { fontSize: 13, color: Colors.outline, fontStyle: 'italic' },
  systemMessage: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 10, paddingHorizontal: Spacing.lg },
  systemDivider: { flex: 1, height: 1, backgroundColor: Colors.outlineVariant },
  systemText: { fontSize: 11, color: Colors.outline, fontWeight: '600', textAlign: 'center' },
  emojiPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, padding: 8, marginLeft: 46, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6, borderWidth: 1, borderColor: Colors.outlineVariant },
  emojiOption: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' },
  emojiOptionText: { fontSize: 20 },
});

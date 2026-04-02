import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../src/hooks/redux';
import { fetchNotifications, markAllRead } from '../../src/store/notificationSlice';
import { formatDistanceToNow } from 'date-fns';

const NOTIFICATION_ICONS: any = {
  mention: { icon: 'at', color: Colors.primary },
  reply: { icon: 'return-down-forward', color: Colors.secondary },
  reaction: { icon: 'happy', color: '#ff9800' },
  dm: { icon: 'chatbubble', color: Colors.secondary },
  thread_reply: { icon: 'git-branch', color: Colors.primary },
  channel_invite: { icon: 'megaphone', color: Colors.secondary },
  system: { icon: 'rocket', color: '#8c00d8' },
};

export default function NotificationsScreen() {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, isLoading } = useAppSelector(s => s.notifications);

  useEffect(() => {
    dispatch(fetchNotifications(1));
  }, [dispatch]);

  const todayNotifs = notifications.filter(n => {
    const d = new Date(n.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const yesterdayNotifs = notifications.filter(n => {
    const d = new Date(n.createdAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  });
  const olderNotifs = notifications.filter(n => {
    const d = new Date(n.createdAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d < yesterday;
  });

  const renderNotification = (item: any) => {
    const config = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.system;
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

    return (
      <TouchableOpacity
        key={item._id}
        style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
        activeOpacity={0.7}
      >
        {!item.isRead && <View style={styles.unreadBar} />}
        <View style={styles.notifAvatar}>
          {item.actor?.avatar ? null : (
            <View style={styles.actorAvatarFallback}>
              <Text style={styles.actorInitials}>
                {item.actor?.displayName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
              </Text>
            </View>
          )}
          <View style={[styles.notifTypeBadge, { backgroundColor: config.color }]}>
            <Ionicons name={config.icon as any} size={10} color="white" />
          </View>
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifText} numberOfLines={2}>
              <Text style={styles.notifActor}>{item.actor?.displayName || 'System'}</Text>
              {' '}
              {item.type === 'mention' && 'mentioned you in'}
              {item.type === 'reply' && 'replied to your thread in'}
              {item.type === 'reaction' && `reacted ${item.content} to your message`}
              {item.type === 'dm' && 'sent you a direct message'}
              {item.type === 'thread_reply' && 'replied in a thread you follow'}
              {item.type === 'system' && item.content}
              {item.channel && (
                <Text style={styles.notifChannel}> #{item.channel?.name}</Text>
              )}
            </Text>
            <Text style={styles.notifTime}>{timeAgo}</Text>
          </View>
          {item.message?.content && (
            <Text style={styles.notifPreview} numberOfLines={1}>{item.message.content}</Text>
          )}
          {item.type === 'mention' && (
            <View style={styles.notifActions}>
              <TouchableOpacity style={styles.notifActionBtn}>
                <Text style={styles.notifActionPrimary}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.notifActionBtnSecondary}>
                <Text style={styles.notifActionSecondary}>Mark as Read</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.sectionDivider} />
        </View>
        {items.map(renderNotification)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Activity</Text>
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={() => dispatch(markAllRead())}
            disabled={unreadCount === 0}
          >
            <Ionicons name="checkmark-done" size={18} color={unreadCount > 0 ? Colors.primary : Colors.outline} />
            <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={48} color={Colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtext}>You have no new notifications.</Text>
          </View>
        ) : (
          <FlatList
            data={[
              { key: 'today', items: todayNotifs, label: 'Today' },
              { key: 'yesterday', items: yesterdayNotifs, label: 'Yesterday' },
              { key: 'older', items: olderNotifs, label: 'Earlier' },
            ]}
            keyExtractor={i => i.key}
            renderItem={({ item }) => <>{renderSection(item.label, item.items)}</>}
            contentContainerStyle={styles.list}
            ListFooterComponent={() => (
              <View style={styles.weeklyCard}>
                <Text style={styles.weeklyTitle}>Weekly Summary</Text>
                <Text style={styles.weeklyText}>
                  You've received {notifications.length} notifications this week.
                </Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.primary, marginLeft: 4 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  markAllTextDisabled: { color: Colors.outline },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40, paddingTop: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md, marginTop: Spacing.xl },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 2 },
  sectionDivider: { flex: 1, height: 1, backgroundColor: Colors.surfaceContainerHigh },
  notifCard: {
    flexDirection: 'row', gap: 14, padding: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, marginBottom: 10, position: 'relative',
    overflow: 'hidden',
  },
  notifCardUnread: { backgroundColor: Colors.surfaceContainerHighest },
  unreadBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: Colors.secondary, borderTopLeftRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
  },
  notifAvatar: { position: 'relative', width: 48, height: 48 },
  actorAvatarFallback: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  actorInitials: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceVariant },
  notifTypeBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.surfaceContainerLowest,
  },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  notifText: { flex: 1, fontSize: 14, color: Colors.onSurface, lineHeight: 20 },
  notifActor: { fontWeight: '700' },
  notifChannel: { fontWeight: '700', color: Colors.primary },
  notifTime: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  notifPreview: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' },
  notifActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  notifActionBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  notifActionPrimary: { fontSize: 12, fontWeight: '700', color: 'white' },
  notifActionBtnSecondary: {
    backgroundColor: Colors.surfaceContainerHighest, borderRadius: BorderRadius.lg,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  notifActionSecondary: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing['2xl'] },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: Colors.onSurfaceVariant },
  weeklyCard: {
    marginTop: Spacing.xl, backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
  },
  weeklyTitle: { fontSize: 16, fontWeight: '700', color: Colors.onPrimary, marginBottom: 6 },
  weeklyText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
});

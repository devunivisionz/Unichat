import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../../src/hooks/redux';
import { api } from '../../../src/services/api';
import { createDM, fetchDMs, setActiveDM } from '../../../src/store/chatSlice';
import { fetchNotifications } from '../../../src/store/notificationSlice';
import { fetchWorkspace } from '../../../src/store/workspaceSlice';
import { joinDM } from '../../../src/services/socket';

type WorkspaceMember = {
  user: {
    _id: string;
    displayName: string;
    avatar?: string | null;
    username: string;
    status?: string;
    statusMessage?: string;
    title?: string;
    lastSeen?: string;
  };
  role: string;
};

type DMItem = {
  _id: string;
  participants: any[];
  isGroup: boolean;
  groupName?: string;
  lastMessage: { content?: string } | null;
  unreadCount: number;
};

function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    online: Colors.statusOnline,
    away: Colors.statusAway,
    busy: Colors.statusBusy,
    offline: Colors.statusOffline,
  };

  return <View style={[styles.statusDot, { backgroundColor: colors[status || 'offline'] || Colors.statusOffline }]} />;
}

export default function DMSDirectoryScreen() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const workspaceKey = Array.isArray(workspaceId) ? (workspaceId[0] ?? '') : (workspaceId ?? '');
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const workspace = useAppSelector((state) => state.workspace.activeWorkspace);
  const dms = useAppSelector((state) => state.chat.dms);
  const me = useAppSelector((state) => state.auth.user);
  const notificationUnreadCount = useAppSelector((state) => state.notifications.unreadCount);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [startingDMUserId, setStartingDMUserId] = useState<string | null>(null);

  const loadDirectoryData = React.useCallback(async () => {
    if (!workspaceKey) {
      setIsLoadingMembers(false);
      return;
    }

    setIsLoadingMembers(true);
    dispatch(fetchWorkspace(workspaceKey));
    dispatch(fetchDMs(workspaceKey));
    dispatch(fetchNotifications(1));

    try {
      const result = await api.workspaces.members(workspaceKey);
      setWorkspaceMembers(result.members || []);
    } catch {
      setWorkspaceMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [dispatch, workspaceKey]);

  useFocusEffect(
    React.useCallback(() => {
      loadDirectoryData();
    }, [loadDirectoryData]),
  );

  const resolvedWorkspaceMembers: WorkspaceMember[] = workspaceMembers.length > 0
    ? workspaceMembers
    : ((workspace?.members as WorkspaceMember[] | undefined) ?? []);

  const personalDMs = dms.filter((dm) => !dm.isGroup);
  const groupDMs = dms.filter((dm) => dm.isGroup);
  const totalDMUnread = dms.reduce((sum, dm) => sum + (dm.unreadCount || 0), 0);

  const getDMOtherUser = (dm: DMItem) => {
    if (dm.isGroup) return null;
    return dm.participants?.find((participant: any) => String(participant._id) !== String(me?._id));
  };

  const personalChatItems = resolvedWorkspaceMembers
    .filter((member) => member.user?._id && String(member.user._id) !== String(me?._id))
    .map((member) => ({
      user: member.user,
      dm: personalDMs.find((dm) => String(getDMOtherUser(dm)?._id) === String(member.user._id)),
    }))
    .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName));

  const handleDMPress = (dm: DMItem) => {
    dispatch(setActiveDM(dm._id));
    joinDM(dm._id);
    router.push(`/(app)/dm/${dm._id}?workspaceId=${workspaceKey}`);
  };

  const handleMemberPress = async (member: WorkspaceMember['user'], existingDM?: DMItem) => {
    if (existingDM) {
      handleDMPress(existingDM);
      return;
    }

    if (!workspaceKey || startingDMUserId) return;

    setStartingDMUserId(member._id);
    try {
      const result = await dispatch(createDM({
        workspaceId: workspaceKey,
        participantIds: [member._id],
      }));

      if (!createDM.fulfilled.match(result)) {
        const errorMessage = typeof result.payload === 'string'
          ? result.payload
          : (result.error?.message || 'Failed to start conversation');
        throw new Error(errorMessage);
      }

      dispatch(setActiveDM(result.payload._id));
      joinDM(result.payload._id);
      router.push(`/(app)/dm/${result.payload._id}?workspaceId=${workspaceKey}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      Alert.alert('Error', errorMessage);
    } finally {
      setStartingDMUserId(null);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/(app)/workspace/${workspaceKey}`)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Direct Messages</Text>
            <Text style={styles.headerSubtitle}>
              {personalChatItems.length} people, {groupDMs.length} groups
            </Text>
          </View>
        </View>

        {isLoadingMembers && personalChatItems.length === 0 && groupDMs.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 110 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>People</Text>
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineBadgeText}>
                  {resolvedWorkspaceMembers.filter((member) => (
                    String(member.user?._id) !== String(me?._id) && member.user?.status === 'online'
                  )).length} Online
                </Text>
              </View>
            </View>

            {personalChatItems.length > 0 ? personalChatItems.map((item) => {
              const name = item.user.displayName || item.user.username || 'Unknown';
              const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
              const preview = item.dm?.lastMessage?.content
                || item.user.statusMessage
                || item.user.title
                || 'Start a conversation';
              const isStarting = startingDMUserId === item.user._id;

              return (
                <TouchableOpacity
                  key={item.user._id}
                  style={styles.listItem}
                  onPress={() => handleMemberPress(item.user, item.dm)}
                  activeOpacity={0.7}
                  disabled={isStarting}
                >
                  <View style={styles.dmAvatarWrap}>
                    <View style={styles.dmAvatar}>
                      <Text style={styles.dmAvatarText}>{initials}</Text>
                    </View>
                    <StatusDot status={item.user.status} />
                  </View>
                  <View style={styles.dmInfo}>
                    <Text style={[styles.dmName, item.dm?.unreadCount ? styles.dmNameUnread : null]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.dmPreview} numberOfLines={1}>{preview}</Text>
                  </View>
                  {isStarting ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : item.dm && item.dm.unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{item.dm.unreadCount > 99 ? '99+' : item.dm.unreadCount}</Text>
                    </View>
                  ) : (
                    <Ionicons name="chatbubble-outline" size={18} color={Colors.outline} />
                  )}
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No teammates available yet</Text>
                <Text style={styles.emptyText}>
                  When workspace members are available, you can start a 1:1 chat from here.
                </Text>
              </View>
            )}

            {groupDMs.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Groups</Text>
                </View>
                {groupDMs.map((dm) => {
                  const name = dm.groupName || 'Group DM';
                  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <TouchableOpacity
                      key={dm._id}
                      style={styles.listItem}
                      onPress={() => handleDMPress(dm)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dmAvatar}>
                        <Text style={styles.dmAvatarText}>{initials}</Text>
                      </View>
                      <View style={styles.dmInfo}>
                        <Text style={[styles.dmName, dm.unreadCount > 0 ? styles.dmNameUnread : null]} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.dmPreview} numberOfLines={1}>
                          {dm.lastMessage?.content || 'Open group conversation'}
                        </Text>
                      </View>
                      {dm.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{dm.unreadCount > 99 ? '99+' : dm.unreadCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}

        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {[
            { icon: 'home-outline', label: 'Home', route: `/(app)/workspace/${workspaceKey}` },
            { icon: 'chatbubble', label: 'DMs', active: true, badge: totalDMUnread },
            { icon: 'notifications-outline', label: 'Activity', route: `/(app)/notifications`, badge: notificationUnreadCount },
            { icon: 'person-outline', label: 'Profile', route: `/(app)/settings` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={styles.navTab}
              onPress={() => tab.route && router.push(tab.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.navIconWrap}>
                <Ionicons
                  name={tab.active ? tab.icon.replace('-outline', '') as any : tab.icon as any}
                  size={22}
                  color={tab.active ? Colors.primary : Colors.onSurfaceVariant}
                />
                {!!tab.badge && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, tab.active ? styles.navLabelActive : null]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  headerSubtitle: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  scrollContent: { paddingTop: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  onlineBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  onlineBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: 12,
  },
  dmAvatarWrap: { position: 'relative' },
  dmAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dmAvatarText: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  dmInfo: { flex: 1 },
  dmName: { fontSize: 14, fontWeight: '500', color: Colors.onSurfaceVariant },
  dmNameUnread: { fontWeight: '700', color: Colors.onSurface },
  dmPreview: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.onPrimary },
  emptyCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  emptyText: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 6, lineHeight: 18 },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  navTab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  navIconWrap: { position: 'relative' },
  navBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.onPrimary },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navLabelActive: { color: Colors.primary },
});

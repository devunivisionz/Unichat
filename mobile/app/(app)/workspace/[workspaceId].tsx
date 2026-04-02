import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SectionList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../../src/hooks/redux';
import { api } from '../../../src/services/api';
import { createDM, fetchChannels, fetchDMs, setActiveChannel, setActiveDM } from '../../../src/store/chatSlice';
import { fetchNotifications } from '../../../src/store/notificationSlice';
import { fetchWorkspace } from '../../../src/store/workspaceSlice';
import { useSocketEvents } from '../../../src/hooks/useSocketEvents';
import { joinChannel, joinDM } from '../../../src/services/socket';

function StatusDot({ status }: { status: string }) {
  const colors: any = { online: Colors.statusOnline, away: Colors.statusAway, busy: Colors.statusBusy, offline: Colors.statusOffline };
  return <View style={[styles.statusDot, { backgroundColor: colors[status] || Colors.statusOffline }]} />;
}

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

export default function WorkspaceScreen() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const workspaceKey = Array.isArray(workspaceId) ? (workspaceId[0] ?? '') : (workspaceId ?? '');
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const channels = useAppSelector(s => s.chat.channels);
  const dms = useAppSelector(s => s.chat.dms);
  const activeChannelId = useAppSelector(s => s.chat.activeChannelId);
  const workspace = useAppSelector(s => s.workspace.activeWorkspace);
  const me = useAppSelector(s => s.auth.user);
  const isLoadingChannels = useAppSelector(s => s.chat.isLoadingChannels);
  const notificationUnreadCount = useAppSelector(s => s.notifications.unreadCount);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [startingDMUserId, setStartingDMUserId] = useState<string | null>(null);

  useSocketEvents(workspaceKey || null);

  const loadWorkspaceData = React.useCallback(async () => {
    if (!workspaceKey) return;

    dispatch(fetchWorkspace(workspaceKey));
    dispatch(fetchChannels(workspaceKey));
    dispatch(fetchDMs(workspaceKey));
    dispatch(fetchNotifications(1));

    try {
      const result = await api.workspaces.members(workspaceKey);
      setWorkspaceMembers(result.members || []);
    } catch {
      setWorkspaceMembers([]);
    }
  }, [dispatch, workspaceKey]);

  useFocusEffect(
    React.useCallback(() => {
      loadWorkspaceData();
    }, [loadWorkspaceData]),
  );

  const handleChannelPress = (channel: any) => {
    dispatch(setActiveChannel(channel._id));
    joinChannel(channel._id);
    router.push(`/(app)/channel/${channel._id}?workspaceId=${workspaceKey}`);
  };

  const handleDMPress = (dm: any) => {
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

  const myChannels = channels.filter(c => c.isMember);
  const otherChannels = channels.filter(c => !c.isMember && c.type === 'public');
  const personalDMs = dms.filter(dm => !dm.isGroup);
  const groupDMs = dms.filter(dm => dm.isGroup);
  const totalDMUnread = dms.reduce((sum, dm) => sum + (dm.unreadCount || 0), 0);
  const totalUnread = channels.reduce((a, c) => a + (c.unreadCount || 0), 0)
    + dms.reduce((a, d) => a + (d.unreadCount || 0), 0);
  type ChannelItem = (typeof channels)[number];
  type DMItem = (typeof dms)[number];
  type PersonalDMItem = {
    kind: 'personal';
    user: WorkspaceMember['user'];
    role: string;
    dm?: DMItem;
  };
  type GroupDMItem = {
    kind: 'group';
    dm: DMItem;
  };
  type WorkspaceDMItem = PersonalDMItem | GroupDMItem;
  type WorkspaceListItem = ChannelItem | WorkspaceDMItem;
  type WorkspaceSection = {
    title: string;
    data: WorkspaceListItem[];
    type: 'channel' | 'browse' | 'dm';
  };

  const getDMOtherUser = (dm: any) => {
    if (dm.isGroup) return null;
    return dm.participants?.find((p: any) => p._id !== me?._id);
  };

  const resolvedWorkspaceMembers: WorkspaceMember[] = workspaceMembers.length > 0
    ? workspaceMembers
    : ((workspace?.members as WorkspaceMember[] | undefined) ?? []);

  const personalChatItems: PersonalDMItem[] = resolvedWorkspaceMembers
    .filter((member) => member.user?._id && String(member.user._id) !== String(me?._id))
    .map((member): PersonalDMItem => ({
      kind: 'personal',
      user: member.user,
      role: member.role,
      dm: personalDMs.find((dm) => String(getDMOtherUser(dm)?._id) === String(member.user._id)),
    }))
    .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName));

  const directMessageItems: WorkspaceDMItem[] = [
    ...personalChatItems,
    ...groupDMs.map((dm): GroupDMItem => ({ kind: 'group', dm })),
  ];

  const sections: WorkspaceSection[] = [
    {
      title: 'Channels',
      data: myChannels,
      type: 'channel',
    },
    {
      title: 'Direct Messages',
      data: directMessageItems,
      type: 'dm',
    },
  ];

  if (otherChannels.length > 0) {
    sections.splice(1, 0, { title: 'Browse Channels', data: otherChannels, type: 'browse' });
  }

  const renderChannel = (channel: ChannelItem, isBrowse = false) => (
    <TouchableOpacity
      key={channel._id}
      style={[styles.listItem, channel._id === activeChannelId && styles.listItemActive]}
      onPress={() => handleChannelPress(channel)}
      activeOpacity={0.7}
    >
      <View style={[styles.channelIcon, { backgroundColor: isBrowse ? Colors.surfaceContainerHigh : `${Colors.primary}15` }]}>
        <Ionicons name="pricetag" size={14} color={isBrowse ? Colors.onSurfaceVariant : Colors.primary} />
      </View>
      <Text style={[styles.channelName, channel.unreadCount > 0 && styles.channelNameUnread]} numberOfLines={1}>
        {channel.name}
      </Text>
      {channel.type === 'private' && <Ionicons name="lock-closed" size={12} color={Colors.outline} />}
      {(channel.unreadCount || 0) > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{channel.unreadCount > 99 ? '99+' : channel.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDM = (item: WorkspaceDMItem) => {
    if (item.kind === 'personal') {
      const name = item.user.displayName || item.user.username || 'Unknown';
      const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
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
            <StatusDot status={item.user.status || 'offline'} />
          </View>
          <View style={styles.dmInfo}>
            <Text style={[styles.channelName, item.dm?.unreadCount ? styles.channelNameUnread : null]} numberOfLines={1}>
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
    }

    const dm = item.dm;
    const other = getDMOtherUser(dm);
    const name = dm.isGroup ? (dm.groupName || 'Group DM') : (other?.displayName || 'Unknown');
    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    return (
      <TouchableOpacity
        key={dm._id}
        style={styles.listItem}
        onPress={() => handleDMPress(dm)}
        activeOpacity={0.7}
      >
        <View style={styles.dmAvatarWrap}>
          <View style={styles.dmAvatar}>
            <Text style={styles.dmAvatarText}>{initials}</Text>
          </View>
          {!dm.isGroup && other && <StatusDot status={other.status || 'offline'} />}
        </View>
        <View style={styles.dmInfo}>
          <Text style={[styles.channelName, dm.unreadCount > 0 && styles.channelNameUnread]} numberOfLines={1}>{name}</Text>
          {dm.lastMessage && (
            <Text style={styles.dmPreview} numberOfLines={1}>{dm.lastMessage.content || 'Attachment'}</Text>
          )}
        </View>
        {(dm.unreadCount || 0) > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{dm.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.push('/(app)/workspaces')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.workspaceInfo}>
            <View style={styles.workspaceBadge}>
              <Text style={styles.workspaceBadgeText}>{workspace?.name?.[0]?.toUpperCase() || 'W'}</Text>
            </View>
            <View>
              <Text style={styles.workspaceName} numberOfLines={1}>{workspace?.name || 'Workspace'}</Text>
              {totalUnread > 0 && <Text style={styles.unreadInfo}>{totalUnread} unread</Text>}
            </View>
          </View>
          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={() => router.push(`/(app)/search/${workspaceKey}`)} style={styles.iconBtn}>
              <Ionicons name="search" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/(app)/create-channel/${workspaceKey}`)} style={styles.iconBtn}>
              <Ionicons name="add" size={22} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push(`/(app)/search/${workspaceKey}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={16} color={Colors.outline} />
          <Text style={styles.searchPlaceholder}>Jump to...</Text>
        </TouchableOpacity>

        {isLoadingChannels ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <SectionList<WorkspaceListItem, WorkspaceSection>
            sections={sections}
            keyExtractor={(item) => {
              if ('kind' in item) {
                return item.kind === 'group' ? `group-${item.dm._id}` : `user-${item.user._id}`;
              }
              return item._id;
            }}
            contentContainerStyle={[
              styles.sectionList,
              { paddingBottom: 120 + insets.bottom },
            ]}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons
                    name={section.type === 'channel' || section.type === 'browse' ? 'chevron-down' : 'chevron-down'}
                    size={16} color={Colors.onSurfaceVariant}
                  />
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                {section.type === 'channel' && (
                  <TouchableOpacity onPress={() => router.push(`/(app)/create-channel/${workspaceKey}`)}>
                    <Ionicons name="add" size={20} color={Colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
                {section.type === 'dm' && (
                  <View style={styles.onlineBadge}>
                    <Text style={styles.onlineBadgeText}>
                      {resolvedWorkspaceMembers.filter((member) => (
                        String(member.user?._id) !== String(me?._id) && member.user?.status === 'online'
                      )).length} Online
                    </Text>
                  </View>
                )}
              </View>
            )}
            renderItem={({ item, section }) => {
              if (section.type === 'dm') return renderDM(item as WorkspaceDMItem);
              return renderChannel(item as ChannelItem, section.type === 'browse');
            }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { bottom: 90 + insets.bottom }]}
          onPress={() => {}}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={24} color={Colors.secondaryContainer} />
        </TouchableOpacity>

        {/* Bottom Nav */}
        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {[
            { icon: 'home', label: 'Home', active: true },
            { icon: 'chatbubble-outline', label: 'DMs', route: `/(app)/dms/${workspaceKey}`, badge: totalDMUnread },
            { icon: 'notifications-outline', label: 'Activity', route: `/(app)/notifications`, badge: notificationUnreadCount },
            { icon: 'person-outline', label: 'Profile', route: `/(app)/settings` },
          ].map(tab => (
            <TouchableOpacity
              key={tab.label}
              style={[styles.navTab, tab.active && styles.navTabActive]}
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
              <Text style={[styles.navLabel, tab.active && styles.navLabelActive]}>{tab.label}</Text>
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
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  workspaceInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  workspaceBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  workspaceBadgeText: { fontSize: 16, fontWeight: '700', color: Colors.onPrimary },
  workspaceName: { fontSize: 16, fontWeight: '700', color: Colors.primary, maxWidth: 140 },
  unreadInfo: { fontSize: 11, color: Colors.secondary, fontWeight: '600' },
  topBarActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    margin: Spacing.lg, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  searchPlaceholder: { fontSize: 14, color: Colors.outline, fontWeight: '500' },
  sectionList: { paddingBottom: 120 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    paddingTop: Spacing.xl,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  onlineBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  onlineBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  listItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    paddingHorizontal: Spacing.lg, gap: 12, borderRadius: 0,
  },
  listItemActive: { backgroundColor: Colors.surfaceContainerHighest },
  channelIcon: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  channelName: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.onSurfaceVariant },
  channelNameUnread: { fontWeight: '700', color: Colors.onSurface },
  unreadBadge: {
    backgroundColor: Colors.error, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  statusDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: Colors.surface,
  },
  dmAvatarWrap: { position: 'relative' },
  dmAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surfaceContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  dmAvatarText: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant },
  dmInfo: { flex: 1 },
  dmPreview: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  bottomNav: {
    flexDirection: 'row', borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingBottom: 8,
  },
  navTab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  navIconWrap: { position: 'relative' },
  navTabActive: { },
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
  navLabel: { fontSize: 10, fontWeight: '600', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  navLabelActive: { color: Colors.primary },
});

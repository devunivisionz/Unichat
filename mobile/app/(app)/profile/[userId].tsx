import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../../src/hooks/redux';
import { api } from '../../../src/services/api';
import { createDM } from '../../../src/store/chatSlice';
import { joinDM } from '../../../src/services/socket';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  online: { color: Colors.statusOnline, label: 'Online' },
  away: { color: Colors.statusAway, label: 'Away' },
  busy: { color: Colors.statusBusy, label: 'Busy' },
  offline: { color: Colors.statusOffline, label: 'Offline' },
};

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const dispatch = useAppDispatch();
  const me = useAppSelector(s => s.auth.user);
  const activeWorkspace = useAppSelector(s => s.workspace.activeWorkspace);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingDM, setIsStartingDM] = useState(false);

  const isMe = userId === me?._id;

  useEffect(() => {
    if (!userId) return;
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const result = await api.users.profile(userId!);
      setUser(result.user);
    } catch {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!activeWorkspace) return;
    setIsStartingDM(true);
    try {
      const result = await dispatch(createDM({
        workspaceId: activeWorkspace._id,
        participantIds: [userId],
      }));

      if (!createDM.fulfilled.match(result)) {
        const errorMessage = typeof result.payload === 'string'
          ? result.payload
          : (result.error?.message || 'Failed to start conversation');
        throw new Error(errorMessage);
      }

      const dm = result.payload;
      joinDM(dm._id);
      router.push(`/(app)/dm/${dm._id}?workspaceId=${activeWorkspace._id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsStartingDM(false);
    }
  };

  const initials = user?.displayName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const statusConf = STATUS_CONFIG[user?.status || 'offline'];
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const lastSeen = user?.lastSeen ? new Date(user.lastSeen) : null;

  const formatLastSeen = () => {
    if (!lastSeen) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return lastSeen.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          {isMe && (
            <TouchableOpacity onPress={() => router.push('/(app)/settings')} style={styles.editBtn}>
              <Ionicons name="create-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : user ? (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <LinearGradient colors={['#300033', '#4a154b']} style={styles.hero}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}
                </View>
                <View style={[styles.statusDot, { backgroundColor: statusConf.color }]} />
              </View>
              <Text style={styles.displayName}>{user.displayName}</Text>
              <Text style={styles.username}>@{user.username}</Text>
              {user.title ? <Text style={styles.title}>{user.title}</Text> : null}
              <View style={styles.statusBadge}>
                <View style={[styles.statusBadgeDot, { backgroundColor: statusConf.color }]} />
                <Text style={styles.statusBadgeText}>{statusConf.label}</Text>
              </View>
            </LinearGradient>

            {/* Actions (only if not me) */}
            {!isMe && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={handleSendMessage}
                  disabled={isStartingDM}
                >
                  {isStartingDM ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="chatbubble" size={18} color="white" />
                      <Text style={styles.primaryActionText}>Message</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryAction}>
                  <Ionicons name="call-outline" size={18} color={Colors.primary} />
                  <Text style={styles.secondaryActionText}>Call</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bio */}
            {user.bio ? (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>ABOUT</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            ) : null}

            {/* Info */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>DETAILS</Text>
              {[
                { icon: 'mail-outline', label: 'Email', value: user.email },
                { icon: 'time-outline', label: 'Local time', value: user.timezone || 'UTC' },
                { icon: 'calendar-outline', label: 'Member since', value: memberSince },
                {
                  icon: 'ellipse', label: 'Last seen',
                  value: user.status === 'online' ? 'Active now' : formatLastSeen(),
                  color: statusConf.color,
                },
              ].map((item, i) => (
                <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
                  <View style={styles.infoIcon}>
                    <Ionicons name={item.icon as any} size={16} color={item.color || Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.notFound}>
            <Ionicons name="person-outline" size={48} color={Colors.outline} />
            <Text style={styles.notFoundText}>User not found</Text>
          </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.primary, marginLeft: 4 },
  editBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 60 },
  hero: {
    alignItems: 'center', paddingTop: Spacing['2xl'] + 8,
    paddingBottom: Spacing['2xl'], paddingHorizontal: Spacing['2xl'],
    gap: 6,
  },
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontWeight: '800', color: 'white' },
  statusDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 3, borderColor: Colors.primaryContainer,
  },
  displayName: { fontSize: 26, fontWeight: '800', color: 'white', letterSpacing: -0.5 },
  username: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  title: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', fontStyle: 'italic' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 4,
  },
  statusBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  actionsRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl,
  },
  primaryAction: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl, paddingVertical: 14,
    ...Shadows.sm,
  },
  primaryActionText: { fontSize: 15, fontWeight: '700', color: 'white' },
  secondaryAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  secondaryActionText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  card: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    padding: Spacing.xl, ...Shadows.sm,
  },
  cardLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.md,
  },
  bioText: { fontSize: 15, color: Colors.onSurface, lineHeight: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: Colors.surfaceContainerLow },
  infoIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '500', color: Colors.onSurface, marginTop: 1 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: Colors.onSurfaceVariant },
});

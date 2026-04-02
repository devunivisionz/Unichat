import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../src/hooks/redux';
import { fetchWorkspaces, setActiveWorkspace } from '../../src/store/workspaceSlice';
import { logout } from '../../src/store/authSlice';
import { joinWorkspace as socketJoinWorkspace } from '../../src/services/socket';

export default function WorkspacesScreen() {
  const dispatch = useAppDispatch();
  const { workspaces, isLoading } = useAppSelector(s => s.workspace);
  const user = useAppSelector(s => s.auth.user);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchWorkspaces());
    setRefreshing(false);
  };

  const handleSelectWorkspace = (workspace: any) => {
    dispatch(setActiveWorkspace(workspace));
    socketJoinWorkspace(workspace._id);
    router.push(`/(app)/workspace/${workspace._id}`);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { dispatch(logout()); router.replace('/(auth)/welcome'); } },
    ]);
  };

  const planColor = (plan: string) => {
    if (plan === 'enterprise') return Colors.secondary;
    if (plan === 'pro') return '#8c00d8';
    return Colors.outline;
  };

  const renderWorkspace = ({ item }: any) => (
    <TouchableOpacity
      style={styles.workspaceCard}
      onPress={() => handleSelectWorkspace(item)}
      activeOpacity={0.8}
    >
      <View style={styles.wsIcon}>
        {item.icon ? (
          <Text style={{ fontSize: 28 }}>{item.icon}</Text>
        ) : (
          <LinearGradient colors={['#300033', '#88438e']} style={styles.wsIconGrad}>
            <Text style={styles.wsIconText}>{item.name[0].toUpperCase()}</Text>
          </LinearGradient>
        )}
      </View>
      <View style={styles.wsInfo}>
        <View style={styles.wsNameRow}>
          <Text style={styles.wsName} numberOfLines={1}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
        </View>
        <View style={styles.wsMeta}>
          {item.plan !== 'free' && (
            <View style={[styles.planBadge, { backgroundColor: `${planColor(item.plan)}20` }]}>
              <Text style={[styles.planText, { color: planColor(item.plan) }]}>{item.plan.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.memberCount}>
            {item.members?.length || 0} member{item.members?.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f9f9ff', '#f0f3ff']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{user?.displayName?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
            <Text style={styles.headerBrand}>Nexus</Text>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={() => {}}>
            <Ionicons name="search" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={workspaces}
          renderItem={renderWorkspace}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <Text style={styles.greeting}>Welcome back,{'\n'}{user?.displayName?.split(' ')[0]}</Text>
              <Text style={styles.greetingSubtext}>Choose a workspace to resume your projects.</Text>
            </View>
          )}
          ListEmptyComponent={() => (
            !isLoading ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={48} color={Colors.outline} />
                </View>
                <Text style={styles.emptyTitle}>No workspaces yet</Text>
                <Text style={styles.emptySubtext}>Create a new workspace or join an existing one.</Text>
              </View>
            ) : (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            )
          )}
          ListFooterComponent={() => (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => router.push('/(app)/create-workspace')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#300033', '#4a154b']} style={styles.createBtnGrad}>
                  <Ionicons name="add-circle-outline" size={22} color="white" />
                  <Text style={styles.createBtnText}>Create new workspace</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => {
                  Alert.prompt?.('Join Workspace', 'Enter invite code:', async (code) => {
                    if (code) {
                      const { joinWorkspace } = await import('../../src/store/workspaceSlice');
                      const result = await dispatch(joinWorkspace(code.trim().toUpperCase()));
                      if (joinWorkspace.fulfilled.match(result)) {
                        handleSelectWorkspace(result.payload);
                      } else {
                        Alert.alert('Error', result.payload as string || 'Invalid invite code');
                      }
                    }
                  }) ?? Alert.alert('Join Workspace', 'Use "Invite Code" from workspace settings');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="people-outline" size={22} color={Colors.onSurface} />
                <Text style={styles.joinBtnText}>Join a workspace</Text>
              </TouchableOpacity>

              <View style={styles.footerMeta}>
                <Text style={styles.footerMetaText}>Not seeing your workspace? </Text>
                <TouchableOpacity onPress={handleLogout}>
                  <Text style={styles.footerLink}>Log out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md,
    backgroundColor: 'rgba(249,249,255,0.8)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.onPrimary },
  headerBrand: { fontSize: 20, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  searchBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: Spacing['2xl'], paddingBottom: 40 },
  listHeader: { paddingTop: Spacing['2xl'], marginBottom: Spacing.xl },
  greeting: { fontSize: 32, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, lineHeight: 40 },
  greetingSubtext: { fontSize: 16, color: Colors.onSurfaceVariant, marginTop: 8, fontWeight: '500' },
  workspaceCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginBottom: 12, ...Shadows.sm,
  },
  wsIcon: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', flexShrink: 0 },
  wsIconGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  wsIconText: { fontSize: 24, fontWeight: '800', color: 'white' },
  wsInfo: { flex: 1 },
  wsNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wsName: { fontSize: 17, fontWeight: '700', color: Colors.onSurface, flex: 1 },
  wsMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  planBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  planText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  memberCount: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing['2xl'] },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  actions: { marginTop: Spacing.xl, gap: 12 },
  createBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  createBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.xl, paddingVertical: 18,
  },
  joinBtnText: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  footerMeta: { flexDirection: 'row', justifyContent: 'center', paddingTop: Spacing.lg },
  footerMetaText: { fontSize: 13, color: Colors.onSurfaceVariant },
  footerLink: { fontSize: 13, fontWeight: '700', color: Colors.secondary },
});

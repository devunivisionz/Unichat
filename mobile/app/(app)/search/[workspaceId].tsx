import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../src/utils/theme';
import { api } from '../../../src/services/api';
import { format } from 'date-fns';
import { useAppSelector } from '../../../src/hooks/redux';

const TABS = ['All', 'Messages', 'Files', 'Users', 'Channels'];

export default function SearchScreen() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [results, setResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches] = useState(['Q3 retrospective notes', 'API integration keys', 'branding-guidelines.zip']);
  const searchTimeout = useRef<any>(null);
  const workspace = useAppSelector(s => s.workspace.activeWorkspace);

  const doSearch = useCallback(async (q: string, tab: string) => {
    if (!q.trim() || !workspaceId) { setResults({}); return; }
    setIsLoading(true);
    try {
      const typeMap: any = { All: 'all', Messages: 'messages', Files: 'files', Users: 'users', Channels: 'channels' };
      const data = await api.search.all(q, workspaceId, typeMap[tab] || 'all');
      setResults(data.results || {});
    } catch { setResults({}); }
    finally { setIsLoading(false); }
  }, [workspaceId]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(text, activeTab), 400);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (query.trim()) doSearch(query, tab);
  };

  const totalResults = Object.values(results).flat().length;

  const renderMessage = (item: any) => (
    <TouchableOpacity
      key={item._id}
      style={styles.resultCard}
      onPress={() => router.push(`/(app)/channel/${item.channel?._id || item.channel}?workspaceId=${workspaceId}`)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIcon}>
        <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
      </View>
      <View style={styles.resultInfo}>
        <View style={styles.resultMeta}>
          <Text style={styles.resultMetaText}>
            {item.channel?.name ? `#${item.channel.name}` : 'DM'}
          </Text>
          <Text style={styles.resultTime}>{format(new Date(item.createdAt), 'MMM d')}</Text>
        </View>
        <Text style={styles.resultContent} numberOfLines={2}>
          {item.content?.replace(new RegExp(query, 'gi'), (match: string) => `[${match}]`) || ''}
        </Text>
        <Text style={styles.resultSender}>{item.sender?.displayName}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderUser = (item: any) => (
    <TouchableOpacity
      key={item._id}
      style={styles.resultCard}
      onPress={() => router.push(`/(app)/profile/${item._id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.userAvatar]}>
        <Text style={styles.userAvatarText}>
          {item.displayName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userTitle}>{item.title || `@${item.username}`}</Text>
      </View>
      <TouchableOpacity style={styles.messageUserBtn}>
        <Text style={styles.messageUserText}>Message</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderChannel = (item: any) => (
    <TouchableOpacity
      key={item._id}
      style={styles.resultCard}
      onPress={() => router.push(`/(app)/channel/${item._id}?workspaceId=${workspaceId}`)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIcon}>
        <Ionicons name="pricetag" size={20} color={Colors.primary} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.userName}>#{item.name}</Text>
        <Text style={styles.userTitle}>{item.members?.length || 0} members</Text>
      </View>
    </TouchableOpacity>
  );

  const allItems = [
    ...(results.messages || []).map((m: any) => ({ ...m, _type: 'message' })),
    ...(results.users || []).map((u: any) => ({ ...u, _type: 'user' })),
    ...(results.channels || []).map((c: any) => ({ ...c, _type: 'channel' })),
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Search</Text>
        </View>

        {/* Search input */}
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search across ${workspace?.name || 'workspace'}...`}
              placeholderTextColor={Colors.outline}
              value={query}
              onChangeText={handleQueryChange}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => doSearch(query, activeTab)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setResults({}); }}>
                <Ionicons name="close" size={20} color={Colors.outline} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : query.trim() ? (
          <FlatList
            data={allItems}
            keyExtractor={i => `${i._type}-${i._id}`}
            renderItem={({ item }) => {
              if (item._type === 'message') return renderMessage(item);
              if (item._type === 'user') return renderUser(item);
              if (item._type === 'channel') return renderChannel(item);
              return null;
            }}
            ListHeaderComponent={
              totalResults > 0 ? (
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>Top Matches</Text>
                  <Text style={styles.resultsCount}>{totalResults} results found</Text>
                </View>
              ) : (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={48} color={Colors.outline} />
                  <Text style={styles.noResultsText}>No results for "{query}"</Text>
                </View>
              )
            }
            contentContainerStyle={styles.resultsList}
          />
        ) : (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            {recentSearches.map((s, i) => (
              <TouchableOpacity key={i} style={styles.recentItem} onPress={() => handleQueryChange(s)}>
                <Ionicons name="time-outline" size={18} color={Colors.outline} />
                <Text style={styles.recentItemText}>{s}</Text>
              </TouchableOpacity>
            ))}

            {/* Pro tip */}
            <View style={styles.proTip}>
              <Text style={styles.proTipTitle}>Search Pro-tip</Text>
              <Text style={styles.proTipText}>
                Use <Text style={styles.proTipCode}>from:username</Text> or{' '}
                <Text style={styles.proTipCode}>in:#channel</Text> to narrow results.
              </Text>
            </View>
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
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow, gap: 8,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  searchBarWrap: { padding: Spacing.lg },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.onSurface },
  tabs: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: 8 },
  tab: {
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  tabTextActive: { color: Colors.onPrimary },
  resultsList: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  resultsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resultsTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  resultsCount: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    marginBottom: 10,
    shadowColor: '#111c2d', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  resultIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: 'center', alignItems: 'center',
  },
  resultInfo: { flex: 1 },
  resultMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultMetaText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  resultTime: { fontSize: 11, color: Colors.onSurfaceVariant },
  resultContent: { fontSize: 14, color: Colors.onSurface, marginTop: 2, lineHeight: 20 },
  resultSender: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  userAvatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceVariant },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  userTitle: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  messageUserBtn: {
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.lg,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  messageUserText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  noResults: { alignItems: 'center', paddingTop: 60 },
  noResultsText: { fontSize: 16, color: Colors.onSurfaceVariant, marginTop: 16 },
  recentSection: { padding: Spacing.xl },
  recentTitle: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: Spacing.md },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow,
  },
  recentItemText: { fontSize: 14, fontWeight: '500', color: Colors.onSurface },
  proTip: {
    marginTop: Spacing.xl, backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
  },
  proTipTitle: { fontSize: 16, fontWeight: '700', color: Colors.onPrimary, marginBottom: 8 },
  proTipText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  proTipCode: { backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: '600' },
});

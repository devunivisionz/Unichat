import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Colors, Spacing, BorderRadius } from '../../../src/utils/theme';
import { api } from '../../../src/services/api';

export default function StarredScreen() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const [starred, setStarred] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    api.starred.list(workspaceId)
      .then(r => setStarred(r.starred))
      .catch(() => Alert.alert('Error', 'Failed to load saved messages'))
      .finally(() => setIsLoading(false));
  }, [workspaceId]);

  const handleUnstar = async (messageId: string) => {
    try {
      await api.starred.unstar(messageId);
      setStarred(prev => prev.filter(s => s.message._id !== messageId));
    } catch {
      Alert.alert('Error', 'Failed to remove from saved');
    }
  };

  const handleNavigate = (item: any) => {
    if (item.channel?._id) {
      router.push(`/(app)/channel/${item.channel._id}?workspaceId=${workspaceId}`);
    }
  };

  const renderItem = ({ item }: any) => {
    const msg = item.message;
    const initials = msg.sender?.displayName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleNavigate(item)} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          <View style={styles.senderAvatar}>
            {msg.sender?.avatar ? (
              <Image source={{ uri: msg.sender.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{msg.sender?.displayName}</Text>
            <Text style={styles.location}>
              {item.channel?.name ? `#${item.channel.name}` : 'Direct Message'} · {format(new Date(msg.createdAt), 'MMM d')}
            </Text>
          </View>
          <TouchableOpacity style={styles.unstarBtn} onPress={() => handleUnstar(msg._id)}>
            <Ionicons name="star" size={18} color="#f59e0b" />
          </TouchableOpacity>
        </View>
        {msg.content ? (
          <Text style={styles.content} numberOfLines={3}>{msg.content}</Text>
        ) : null}
        {msg.attachments?.length > 0 && (
          <View style={styles.attachmentPreview}>
            {msg.attachments[0].type === 'image' ? (
              <Image source={{ uri: msg.attachments[0].url }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.filePreview}>
                <Ionicons name="document-outline" size={16} color={Colors.primary} />
                <Text style={styles.fileName} numberOfLines={1}>{msg.attachments[0].name}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Saved Messages</Text>
          <View style={styles.starIcon}>
            <Ionicons name="star" size={18} color="#f59e0b" />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : starred.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="star-outline" size={48} color={Colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>No saved messages</Text>
            <Text style={styles.emptySubtext}>Star messages to save them here for quick access.</Text>
          </View>
        ) : (
          <FlatList
            data={starred}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
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
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.primary, marginLeft: 4 },
  starIcon: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, marginBottom: 10,
    shadowColor: '#111c2d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  senderAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 36, height: 36 },
  avatarText: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant },
  senderInfo: { flex: 1 },
  senderName: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  location: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 1 },
  unstarBtn: { padding: 4 },
  content: { fontSize: 14, color: Colors.onSurface, lineHeight: 20 },
  attachmentPreview: { marginTop: 8 },
  imagePreview: { width: '100%', height: 160, borderRadius: BorderRadius.lg },
  filePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg, padding: 10,
  },
  fileName: { fontSize: 13, color: Colors.onSurface, flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
});

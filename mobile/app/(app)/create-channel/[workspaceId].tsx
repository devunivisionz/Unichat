import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../../src/utils/theme';
import { useAppDispatch } from '../../../src/hooks/redux';
import { api } from '../../../src/services/api';
import { addChannel } from '../../../src/store/chatSlice';

export default function CreateChannelScreen() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sanitizeName = (text: string) =>
    text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 80);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Channel name is required'); return; }
    if (!workspaceId) return;

    setIsLoading(true);
    try {
      const result = await api.channels.create({
        workspaceId, name: sanitizeName(name), description, type: isPrivate ? 'private' : 'public',
      });
      dispatch(addChannel(result.channel));
      router.replace(`/(app)/channel/${result.channel._id}?workspaceId=${workspaceId}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create channel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>New Channel</Text>
          <TouchableOpacity
            style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.createBtnText}>Create</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Preview */}
          <View style={styles.previewCard}>
            <View style={styles.previewIcon}>
              <Ionicons name={isPrivate ? 'lock-closed' : 'pricetag'} size={28} color={Colors.primary} />
            </View>
            <Text style={styles.previewName}>
              #{name ? sanitizeName(name) : 'channel-name'}
            </Text>
            <Text style={styles.previewType}>{isPrivate ? 'Private' : 'Public'} Channel</Text>
          </View>

          <View style={styles.form}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>CHANNEL NAME</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.prefix}>#</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. marketing, design-reviews"
                  placeholderTextColor={Colors.outline}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
              <Text style={styles.hint}>Lowercase letters, numbers, hyphens</Text>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>DESCRIPTION (optional)</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="What's this channel about?"
                placeholderTextColor={Colors.outline}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
            </View>

            {/* Privacy toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={styles.toggleIconWrap}>
                  <Ionicons name={isPrivate ? 'lock-closed' : 'people'} size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.toggleTitle}>{isPrivate ? 'Private' : 'Public'} Channel</Text>
                  <Text style={styles.toggleSubtitle}>
                    {isPrivate ? 'Only invited members can see this channel' : 'Anyone in the workspace can join'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips for great channels</Text>
            {[
              'Use descriptive names like #product-feedback',
              'Public channels are discoverable by all members',
              'Set a clear description so people know what it\'s for',
            ].map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
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
  createBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: 8,
  },
  createBtnDisabled: { backgroundColor: Colors.outline },
  createBtnText: { fontSize: 14, fontWeight: '700', color: 'white' },
  scroll: { padding: Spacing.xl },
  previewCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.xl,
    shadowColor: '#111c2d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  previewIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  previewName: { fontSize: 22, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  previewType: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 4, fontWeight: '500' },
  form: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, marginBottom: Spacing.xl,
    shadowColor: '#111c2d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  field: { marginBottom: Spacing.xl },
  label: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  prefix: { fontSize: 18, fontWeight: '700', color: Colors.onSurfaceVariant, marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: Colors.onSurface, paddingVertical: Spacing.md },
  hint: { fontSize: 11, color: Colors.outline, marginTop: 6 },
  textArea: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    padding: Spacing.md, fontSize: 14, color: Colors.onSurface,
    minHeight: 80, textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center',
  },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  toggleSubtitle: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2, maxWidth: 200 },
  tips: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.md },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipText: { fontSize: 13, color: Colors.onSurfaceVariant, flex: 1, lineHeight: 20 },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../src/hooks/redux';
import { createWorkspace } from '../../src/store/workspaceSlice';
import { fetchChannels, fetchDMs } from '../../src/store/chatSlice';
import { joinWorkspace as socketJoinWorkspace } from '../../src/services/socket';

const EMOJIS = ['🚀', '⚡', '🎯', '💡', '🔥', '✨', '🌟', '🎨', '🛠️', '📊'];

export default function CreateWorkspaceScreen() {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(s => s.workspace);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Workspace name is required'); return; }
    console.log('Creating workspace:', name.trim());
    try {
      const result = await dispatch(createWorkspace({ name: name.trim(), description: description.trim() }));
      console.log('Create workspace result:', result);
      if (createWorkspace.fulfilled.match(result)) {
        const ws = result.payload;
        console.log('Workspace created:', ws);
        socketJoinWorkspace(ws._id);
        dispatch(fetchChannels(ws._id));
        dispatch(fetchDMs(ws._id));
        router.replace(`/(app)/workspace/${ws._id}`);
      } else {
        console.log('Create workspace failed:', result.payload);
        Alert.alert('Error', result.payload as string || 'Failed to create workspace');
      }
    } catch (err) {
      console.log('Create workspace error:', err);
      Alert.alert('Error', String(err));
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f9f9ff', '#f0f3ff']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Create Workspace</Text>
            <TouchableOpacity
              style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.createBtnText}>Create</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Preview */}
            <View style={styles.previewCard}>
              <LinearGradient colors={['#300033', '#88438e']} style={styles.previewIcon}>
                <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
              </LinearGradient>
              <Text style={styles.previewName}>{name || 'Workspace Name'}</Text>
              {description ? <Text style={styles.previewDesc}>{description}</Text> : null}
            </View>

            {/* Emoji picker */}
            <View style={styles.emojiSection}>
              <Text style={styles.sectionLabel}>WORKSPACE ICON</Text>
              <View style={styles.emojiGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnActive]}
                    onPress={() => setSelectedEmoji(e)}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>WORKSPACE NAME *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Acme Corp, Design Studio..."
                  placeholderTextColor={Colors.outline}
                  autoFocus
                  maxLength={80}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput
                  style={styles.textArea}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What does your team work on?"
                  placeholderTextColor={Colors.outline}
                  multiline
                  maxLength={300}
                />
              </View>
            </View>

            {/* What's included */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>What's included</Text>
              {[
                { icon: 'pricetag', text: '#general and #random channels created automatically' },
                { icon: 'people', text: 'Invite team members with a shareable link' },
                { icon: 'chatbubbles', text: 'Direct messages and group DMs' },
                { icon: 'search', text: 'Full search across all messages and files' },
              ].map((item, i) => (
                <View key={i} style={styles.infoItem}>
                  <Ionicons name={item.icon as any} size={16} color={Colors.secondary} />
                  <Text style={styles.infoText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.primary, marginLeft: 4 },
  createBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  createBtnDisabled: { backgroundColor: Colors.outline },
  createBtnText: { fontSize: 14, fontWeight: '700', color: 'white' },
  scroll: { padding: Spacing.xl, paddingBottom: 60 },
  previewCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'], alignItems: 'center', marginBottom: Spacing.xl,
    shadowColor: '#111c2d', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  previewIcon: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  previewEmoji: { fontSize: 40 },
  previewName: { fontSize: 24, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  previewDesc: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 6, textAlign: 'center' },
  emojiSection: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, marginBottom: Spacing.lg,
  },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.md },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center',
  },
  emojiBtnActive: { backgroundColor: Colors.primaryFixed, borderWidth: 2, borderColor: Colors.primary },
  emojiText: { fontSize: 26 },
  form: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, marginBottom: Spacing.lg,
  },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: 15, color: Colors.onSurface,
  },
  textArea: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    padding: Spacing.md, fontSize: 14, color: Colors.onSurface,
    minHeight: 80, textAlignVertical: 'top',
  },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.md },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  infoText: { fontSize: 13, color: Colors.onSurfaceVariant, flex: 1, lineHeight: 20 },
});

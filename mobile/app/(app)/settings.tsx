import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, Switch, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../src/hooks/redux';
import { logout, updateProfile, setSoundEnabled } from '../../src/store/authSlice';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/services/api';
import { updatePresence } from '../../src/services/socket';
import { soundService } from '../../src/utils/SoundService';

const STATUS_OPTIONS = [
  { key: 'online', label: 'Online', color: Colors.statusOnline },
  { key: 'away', label: 'Away', color: Colors.statusAway },
  { key: 'busy', label: 'Busy', color: Colors.statusBusy },
];

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const soundEnabled = useAppSelector(s => s.auth.soundEnabled);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [title, setTitle] = useState(user?.title || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await dispatch(updateProfile({ displayName, title, bio }));
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    updatePresence(status);
    await dispatch(updateProfile({ status: status as any }));
  };

  const handleAvatarEdit = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsSaving(true);
      try {
        const asset = result.assets[0];
        const uploadResult = await api.files.upload({
          uri: asset.uri,
          name: asset.fileName || `avatar_${user?._id}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });

        await dispatch(updateProfile({ 
          avatar: uploadResult.url,
          avatarPublicId: uploadResult.publicId 
        }));
        Alert.alert('Success', 'Profile picture updated');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to upload profile picture');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => {
          await dispatch(logout());
          router.replace('/(auth)/welcome');
        }
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Unichat</Text>
          <View style={styles.headerRight}>
            {!editing ? (
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Profile Hero */}
          <View style={styles.profileHero}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.avatarEditBtn} onPress={handleAvatarEdit}>
                <Ionicons name="camera" size={14} color="white" />
              </TouchableOpacity>
              <View style={[styles.statusIndicator, { backgroundColor: STATUS_OPTIONS.find(s => s.key === user?.status)?.color || Colors.statusOffline }]} />
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.workspaceBadge}>
                <Text style={styles.workspaceBadgeText}>Indigo Nexus</Text>
              </View>
              {editing ? (
                <TextInput
                  style={styles.nameInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Display name"
                  placeholderTextColor={Colors.outline}
                />
              ) : (
                <Text style={styles.name}>{user?.displayName}</Text>
              )}
              {editing ? (
                <TextInput
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Job title"
                  placeholderTextColor={Colors.outline}
                />
              ) : (
                <Text style={styles.userTitle}>{user?.title || 'Add your title'}</Text>
              )}
            </View>
          </View>

          {/* Status Selector */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="happy-outline" size={18} color={Colors.primary} /> Set Status
            </Text>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.statusOption, user?.status === opt.key && styles.statusOptionActive]}
                onPress={() => handleStatusChange(opt.key)}
              >
                <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.statusLabel, user?.status === opt.key && styles.statusLabelActive]}>{opt.label}</Text>
                {user?.status === opt.key && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Bio editing */}
          {editing && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bio</Text>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell your team about yourself..."
                placeholderTextColor={Colors.outline}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>
          )}

          {/* Account */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>
            {[
              { icon: 'mail-outline', title: 'Email Address', value: user?.email },
              { icon: 'lock-closed-outline', title: 'Password', value: 'Last updated 3 months ago' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.settingRow}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingValue} numberOfLines={1}>{item.value}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Preferences */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preferences</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="moon-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingValue}>Switch to high-contrast theme</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                thumbColor="white"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingValue}>Deliver alerts while app is closed</Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                thumbColor="white"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="volume-high-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Sound Notifications</Text>
                <Text style={styles.settingValue}>Play a tone for new activity</Text>
              </View>
              <TouchableOpacity 
                style={styles.testSoundBtn}
                onPress={() => { soundService.playNotification(); }}
              >
                <Ionicons name="play" size={16} color={Colors.primary} />
                <Text style={styles.testSoundText}>Test</Text>
              </TouchableOpacity>
              <Switch
                value={soundEnabled}
                onValueChange={(val) => { dispatch(setSoundEnabled(val)); }}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          {/* Support */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Support</Text>
            {[
              { icon: 'help-circle-outline', title: 'Help Center', arrow: 'open-in-new' },
              { icon: 'shield-checkmark-outline', title: 'Privacy Policy', arrow: 'chevron-forward' },
              { icon: 'document-text-outline', title: 'Terms of Service', arrow: 'chevron-forward' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.settingRow}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={[styles.settingTitle, { flex: 1 }]}>{item.title}</Text>
                <Ionicons name={item.arrow as any} size={18} color={Colors.outline} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Log out of Indigo Nexus</Text>
          </TouchableOpacity>
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
  headerRight: {},
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: 'white' },
  scroll: { padding: Spacing.xl, paddingBottom: 60 },
  profileHero: { flexDirection: 'row', alignItems: 'flex-end', gap: 20, marginBottom: Spacing.xl },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontWeight: '800', color: Colors.onPrimary },
  avatarEditBtn: {
    position: 'absolute', bottom: -4, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.secondary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  statusIndicator: {
    position: 'absolute', bottom: 0, left: -2,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 3, borderColor: Colors.surface,
  },
  profileInfo: { flex: 1 },
  workspaceBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  workspaceBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  name: { fontSize: 28, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  nameInput: { fontSize: 22, fontWeight: '700', color: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryContainer, paddingBottom: 4 },
  userTitle: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 4 },
  titleInput: { fontSize: 14, color: Colors.onSurfaceVariant, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant, paddingBottom: 4, marginTop: 4 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, marginBottom: Spacing.lg,
    shadowColor: '#111c2d', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.lg },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: 6,
  },
  statusOptionActive: { backgroundColor: Colors.surfaceContainerHighest },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: 15, fontWeight: '500', color: Colors.onSurfaceVariant },
  statusLabelActive: { fontWeight: '700', color: Colors.onSurface },
  bioInput: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    padding: Spacing.md, fontSize: 14, color: Colors.onSurface,
    minHeight: 80, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: Colors.outline, textAlign: 'right', marginTop: 6 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: Spacing.md, borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  settingIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHighest,
    justifyContent: 'center', alignItems: 'center',
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  settingValue: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: Spacing.xl,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.error },
  testSoundBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceContainerHighest,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.full, marginRight: 8,
  },
  testSoundText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
});

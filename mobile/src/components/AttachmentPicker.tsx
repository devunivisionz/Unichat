import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../utils/theme';
import { api } from '../services/api';

interface Attachment {
  url: string;
  publicId: string;
  name: string;
  mimeType: string;
  size: number;
  type: 'image' | 'video' | 'audio' | 'document';
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAttachmentReady: (attachment: Attachment) => void;
}

const PICKER_OPTIONS = [
  { id: 'camera', icon: 'camera', label: 'Camera', color: '#4a154b' },
  { id: 'gallery', icon: 'images', label: 'Photo & Video', color: '#7c3aed' },
  { id: 'file', icon: 'document-attach', label: 'File', color: '#0891b2' },
];

export default function AttachmentPicker({ visible, onClose, onAttachmentReady }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const requestPermission = async (type: 'camera' | 'library') => {
    if (Platform.OS === 'web') return true;
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
  };

  const uploadFile = async (uri: string, name: string, mimeType: string) => {
    setUploading(true);
    setUploadProgress('Uploading...');
    try {
      const result = await api.files.upload({ uri, name, type: mimeType });
      onAttachmentReady(result);
      onClose();
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Please try again');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleCamera = async () => {
    const granted = await requestPermission('camera');
    if (!granted) { Alert.alert('Permission denied', 'Camera access is required.'); return; }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName || `photo_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
      const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
      await uploadFile(asset.uri, name, mimeType);
    }
  };

  const handleGallery = async () => {
    const granted = await requestPermission('library');
    if (!granted) { Alert.alert('Permission denied', 'Photo library access is required.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName || `media_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
      const mimeType = asset.type === 'video'
        ? (asset.mimeType || 'video/mp4')
        : (asset.mimeType || 'image/jpeg');
      await uploadFile(asset.uri, name, mimeType);
    }
  };

  const handleDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleOption = async (id: string) => {
    if (id === 'camera') await handleCamera();
    else if (id === 'gallery') await handleGallery();
    else if (id === 'file') await handleDocument();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {uploading ? (
            <View style={styles.uploading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.uploadingText}>{uploadProgress}</Text>
            </View>
          ) : (
            <>
              <View style={styles.handle} />
              <Text style={styles.title}>Share</Text>
              <View style={styles.options}>
                {PICKER_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.option}
                    onPress={() => handleOption(opt.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: opt.color }]}>
                      <Ionicons name={opt.icon as any} size={26} color="white" />
                    </View>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 40, paddingHorizontal: Spacing.xl,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  title: {
    fontSize: 18, fontWeight: '700', color: Colors.onSurface,
    textAlign: 'center', marginBottom: Spacing.xl,
  },
  options: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginBottom: Spacing.xl,
  },
  option: { alignItems: 'center', gap: 8 },
  optionIcon: {
    width: 72, height: 72, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  optionLabel: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  cancelBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.xl, paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  uploading: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  uploadingText: { fontSize: 16, fontWeight: '600', color: Colors.onSurfaceVariant },
});

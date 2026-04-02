import React, { useState } from 'react';
import {
  View, StyleSheet, Modal, TouchableOpacity, Text,
  Dimensions, StatusBar, ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  uri: string;
  type: 'image' | 'video';
  name?: string;
  onClose: () => void;
}

export default function MediaViewer({ visible, uri, type, name, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar hidden />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          {name ? <Text style={styles.name} numberOfLines={1}>{name}</Text> : <View style={{ flex: 1 }} />}
          <View style={styles.actions}>
            {/* Share / download placeholder */}
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="share-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.mediaContainer}>
          {isLoading && (
            <ActivityIndicator size="large" color="white" style={StyleSheet.absoluteFill} />
          )}
          {type === 'image' ? (
            <Image
              source={{ uri }}
              style={styles.image}
              contentFit="contain"
              onLoadEnd={() => setIsLoading(false)}
            />
          ) : (
            // Video preview — show thumbnail with play indicator
            <View style={styles.videoPlaceholder}>
              <Image
                source={{ uri }}
                style={styles.image}
                contentFit="contain"
                onLoadEnd={() => setIsLoading(false)}
              />
              <View style={styles.playOverlay}>
                <View style={styles.playBtn}>
                  <Ionicons name="play" size={36} color="white" />
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },
  name: {
    flex: 1, fontSize: 15, fontWeight: '600', color: 'white',
    textAlign: 'center', marginHorizontal: 8,
  },
  actions: { flexDirection: 'row' },
  actionBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: W, height: H * 0.75 },
  videoPlaceholder: { width: W, height: H * 0.75, position: 'relative' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
  },
});

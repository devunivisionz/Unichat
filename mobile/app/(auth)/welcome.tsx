import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/utils/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#300033', '#4a154b', '#300033']} style={StyleSheet.absoluteFill} />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />

      <SafeAreaView style={styles.safe}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>⬡</Text>
          </View>
          <Text style={styles.appName}>Unichat</Text>
          <Text style={styles.tagline}>Indigo Nexus Ecosystem</Text>
        </View>

        {/* Illustration Area */}
        <View style={styles.illustrationArea}>
          <View style={styles.illustrationCard}>
            <View style={styles.chatBubble}>
              <View style={styles.avatarSmall} />
              <View style={styles.bubbleContent}>
                <View style={[styles.bubbleLine, { width: '80%' }]} />
                <View style={[styles.bubbleLine, { width: '60%', marginTop: 6 }]} />
              </View>
            </View>
            <View style={[styles.chatBubble, styles.chatBubbleRight]}>
              <View style={[styles.bubbleContentRight]}>
                <View style={[styles.bubbleLine, { width: '70%', backgroundColor: 'rgba(255,255,255,0.7)' }]} />
              </View>
              <View style={[styles.avatarSmall, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            </View>
            {/* Status chip */}
            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>12 Online</Text>
            </View>
          </View>
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <Text style={styles.headline}>Connect with anyone,{'\n'}anywhere.</Text>
          <Text style={styles.subtext}>
            Unichat brings your team together in one place, no matter where you are.
          </Text>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryBtnText}>Log into existing workspace</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing['2xl'] },
  circle: {
    position: 'absolute', borderRadius: 9999,
    backgroundColor: 'rgba(251,171,254,0.08)',
  },
  circleTop: { width: 300, height: 300, top: -80, right: -60 },
  circleBottom: { width: 400, height: 400, bottom: -100, left: -100 },
  logoArea: { alignItems: 'center', paddingTop: Spacing['2xl'] },
  logoIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoIconText: { fontSize: 36, color: Colors.primaryFixed },
  appName: {
    fontSize: 32, fontWeight: '800', color: Colors.onPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3, textTransform: 'uppercase', marginTop: 4,
  },
  illustrationArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  illustrationCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24, padding: Spacing.lg,
    width: width * 0.78, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  chatBubble: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chatBubbleRight: { justifyContent: 'flex-end' },
  avatarSmall: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,214,248,0.4)',
    flexShrink: 0,
  },
  bubbleContent: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, flex: 1 },
  bubbleContentRight: { backgroundColor: Colors.secondary, borderRadius: 12, padding: 10 },
  bubbleLine: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'center',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50' },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  textArea: { alignItems: 'center', marginBottom: Spacing.xl },
  headline: {
    fontSize: 32, fontWeight: '800', color: Colors.onPrimary,
    textAlign: 'center', letterSpacing: -0.5, lineHeight: 40,
    marginBottom: Spacing.md,
  },
  subtext: {
    fontSize: 16, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', lineHeight: 24,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 24, backgroundColor: Colors.onPrimary },
  actions: { gap: Spacing.md, paddingBottom: Spacing.xl },
  primaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.xl, paddingVertical: 18,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: Colors.onPrimary },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12 },
  secondaryBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
});

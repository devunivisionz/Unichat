import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../src/utils/theme';
import { useAppDispatch, useAppSelector } from '../../src/hooks/redux';
import { login, clearError } from '../../src/store/authSlice';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(s => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const result = await dispatch(login({ email: email.trim(), password }));
    if (login.fulfilled.match(result)) {
      router.replace('/(app)/workspaces');
    } else {
      Alert.alert('Login Failed', result.payload as string || 'Invalid credentials');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f9f9ff', '#f0f3ff']} style={StyleSheet.absoluteFill} />
      {/* Decorative blobs */}
      <View style={styles.blobTL} />
      <View style={styles.blobBR} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Back button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={Colors.primary} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoWrap}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>⬡</Text>
                </View>
              </View>
              <Text style={styles.appName}>Unichat</Text>
              <Text style={styles.subtitle}>INDIGO NEXUS WORKSPACE</Text>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>Sign in to your workspace</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CORPORATE EMAIL</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="at" size={18} color={Colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="alex@indigo.com"
                    placeholderTextColor={Colors.outline}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>PASSWORD</Text>
                  <TouchableOpacity>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed" size={18} color={Colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.outline}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.outline} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#300033', '#4a154b']} style={styles.loginBtnGrad}>
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.loginBtnText}>Log In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn}>
                  <Ionicons name="logo-google" size={20} color={Colors.onSurface} />
                  <Text style={styles.socialBtnText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn}>
                  <Ionicons name="logo-apple" size={20} color={Colors.onSurface} />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
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
  scroll: { padding: Spacing['2xl'], flexGrow: 1 },
  blobTL: { position: 'absolute', top: -60, left: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(74,21,75,0.05)' },
  blobBR: { position: 'absolute', bottom: -80, right: -60, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(136,67,142,0.06)' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoWrap: { marginBottom: Spacing.md },
  logo: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLowest,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  logoText: { fontSize: 36, color: Colors.primary },
  appName: { fontSize: 28, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 10, color: Colors.onSurfaceVariant, letterSpacing: 3, marginTop: 4, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius['2xl'], padding: Spacing['2xl'],
    shadowColor: '#111c2d', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
    marginBottom: Spacing.xl,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: Spacing.xl },
  fieldGroup: { marginBottom: Spacing.lg },
  label: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 2, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotText: { fontSize: 11, fontWeight: '700', color: Colors.secondary, letterSpacing: 1, textTransform: 'uppercase' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: 2,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, fontSize: 15, color: Colors.onSurface,
    paddingVertical: Spacing.md,
  },
  loginBtn: { marginTop: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  loginBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: Colors.onPrimary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.xl },
  divider: { flex: 1, height: 1, backgroundColor: Colors.surfaceContainerHigh },
  dividerText: { fontSize: 9, fontWeight: '700', color: `${Colors.onSurfaceVariant}99`, marginHorizontal: 12, letterSpacing: 2 },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg, paddingVertical: 14,
  },
  socialBtnText: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: Spacing.lg },
  footerText: { fontSize: 14, color: Colors.onSurfaceVariant },
  footerLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});

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
import { register } from '../../src/store/authSlice';
import { Ionicons } from '@expo/vector-icons';

const ALLOWED_EMAIL_DOMAIN = 'univisionz.com';

export default function RegisterScreen() {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(s => s.auth);
  const [form, setForm] = useState({ displayName: '', email: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.displayName || !form.email || !form.username || !form.password) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    if (!form.email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      Alert.alert('Error', `Only @${ALLOWED_EMAIL_DOMAIN} email addresses can create accounts`); return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters'); return;
    }
    const result = await dispatch(register({
      displayName: form.displayName,
      email: form.email.trim(),
      username: form.username.trim().toLowerCase(),
      password: form.password,
    }));
    if (register.fulfilled.match(result)) {
      router.replace('/(app)/workspaces');
    } else {
      Alert.alert('Registration Failed', result.payload as string || 'Please try again');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f9f9ff', '#f0f3ff']} style={StyleSheet.absoluteFill} />
      <View style={styles.blobTL} />
      <View style={styles.blobBR} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.brand}>Unichat</Text>
              <Text style={styles.headline}>Join the conversation</Text>
              <Text style={styles.subtext}>Use your @univisionz.com email to join the default Univisionz workspace.</Text>
            </View>

            <View style={styles.card}>
              {[
                { key: 'displayName', label: 'FULL NAME', placeholder: 'Alex Rivers', icon: 'person-outline', type: 'default' },
                { key: 'email', label: 'EMAIL ADDRESS', placeholder: 'alex@univisionz.com', icon: 'mail-outline', type: 'email-address' },
                { key: 'username', label: 'USERNAME', placeholder: 'alexrivers', icon: 'at', type: 'default' },
              ].map(field => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.label}>{field.label}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name={field.icon as any} size={18} color={Colors.outline} style={styles.icon} />
                    <TextInput
                      style={styles.input}
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.outline}
                      value={(form as any)[field.key]}
                      onChangeText={set(field.key)}
                      keyboardType={field.type as any}
                      autoCapitalize={field.key === 'email' || field.key === 'username' ? 'none' : 'words'}
                      autoCorrect={false}
                    />
                  </View>
                </View>
              ))}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.outline} style={styles.icon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.outline}
                    value={form.password}
                    onChangeText={set('password')}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.outline} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.createBtn}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#300033', '#4a154b']} style={styles.createBtnGrad}>
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.createBtnText}>Create Account</Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.terms}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.footerLink}>Log in</Text>
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
  blobTL: { position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(74,21,75,0.05)' },
  blobBR: { position: 'absolute', bottom: -80, right: -60, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(136,67,142,0.06)' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: Spacing.md },
  header: { marginBottom: Spacing.xl },
  brand: { fontSize: 18, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5, marginBottom: 8 },
  headline: { fontSize: 34, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, lineHeight: 40 },
  subtext: { fontSize: 15, color: Colors.onSurfaceVariant, marginTop: 10, lineHeight: 22 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius['2xl'], padding: Spacing['2xl'],
    shadowColor: '#111c2d', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
    marginBottom: Spacing.xl,
  },
  fieldGroup: { marginBottom: Spacing.lg },
  label: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.onSurface, paddingVertical: Spacing.md },
  createBtn: { marginTop: Spacing.md, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  createBtnGrad: { paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: Colors.onPrimary },
  terms: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: Spacing.lg, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: Spacing.lg },
  footerText: { fontSize: 14, color: Colors.onSurfaceVariant },
  footerLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});

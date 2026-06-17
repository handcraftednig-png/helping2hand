import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, GraduationCap, ArrowLeft, CircleAlert } from 'lucide-react-native';
import { colors, dark, gold, spacing, borderRadius } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { signUpWithEmail } = useAuth();

  const handleSignup = async () => {
    setErrorMsg('');
    if (!email.trim()) { setErrorMsg('Please enter your email'); return; }
    if (!password.trim()) { setErrorMsg('Please enter a password'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setErrorMsg('Passwords do not match'); return; }
    setLoading(true);
    const { error } = await signUpWithEmail(email.trim(), password);
    setLoading(false);
    if (error) { setErrorMsg(error.message); return; }
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color={dark.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <GraduationCap size={48} color={gold[400]} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Get started with Helping Hand AI</Text>
        </View>

        <View style={styles.form}>
          {!!errorMsg && (
            <View style={styles.errorBanner}>
              <CircleAlert size={16} color={colors.error[600]} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Mail size={20} color={dark.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={dark.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={dark.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor={dark.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              {showPassword ? <EyeOff size={20} color={dark.textSecondary} /> : <Eye size={20} color={dark.textSecondary} />}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={dark.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={dark.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
              {showConfirmPassword ? <EyeOff size={20} color={dark.textSecondary} /> : <Eye size={20} color={dark.textSecondary} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}>
            {loading ? <ActivityIndicator color={dark.bg} /> : <Text style={styles.signupButtonText}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg },
  backButton: { position: 'absolute', top: spacing.xl + 40, left: spacing.lg, zIndex: 10, padding: spacing.sm },
  content: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center', paddingTop: spacing['2xl'] },
  header: { alignItems: 'center', marginBottom: spacing['2xl'] },
  iconContainer: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: dark.goldSurface,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
    borderWidth: 1, borderColor: `${gold[400]}50`,
    shadowColor: gold[400], shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 32, color: dark.text, marginBottom: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: dark.textSecondary },
  form: { marginBottom: spacing.xl },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.error[100], borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: `${colors.error[600]}50`,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  errorBannerText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.error[700] },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: dark.surface,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: dark.border,
    marginBottom: spacing.md, paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: dark.text, paddingVertical: spacing.md },
  eyeButton: { padding: spacing.sm },
  signupButton: {
    backgroundColor: gold[400], paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.sm,
  },
  signupButtonDisabled: { backgroundColor: dark.elevated },
  signupButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.bg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing['2xl'], gap: spacing.sm },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.textSecondary },
  loginLink: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: gold[400] },
});

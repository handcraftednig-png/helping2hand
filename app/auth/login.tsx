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
import { Mail, Lock, Eye, EyeOff, GraduationCap, CircleAlert } from 'lucide-react-native';
import { colors, dark, gold, spacing, borderRadius } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import { haptics } from '@/lib/haptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { signInWithEmail, signInWithGoogle } = useAuth();

  const handleEmailLogin = async () => {
    setErrorMsg('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const nextEmailError = !trimmedEmail
      ? 'Enter your email'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
      ? 'Enter a valid email address'
      : '';
    const nextPasswordError = !trimmedPassword ? 'Enter your password' : '';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) { haptics.warning(); return; }

    haptics.tap();
    setLoading(true);
    const { error } = await signInWithEmail(trimmedEmail, trimmedPassword);
    setLoading(false);
    if (error) { haptics.warning(); setErrorMsg(error.message); return; }
    router.replace('/(tabs)');
  };

  const handleGoogleLogin = async () => {
    haptics.tap();
    setErrorMsg('');
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) { haptics.warning(); setErrorMsg(error.message); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <GraduationCap size={48} color={gold[400]} />
          </View>
          <Text style={styles.title}>Helping Hand AI</Text>
          <Text style={styles.subtitle}>Your AI-powered student assistant</Text>
        </View>

        <View style={styles.form}>
          {!!errorMsg && (
            <View style={styles.errorBanner}>
              <CircleAlert size={16} color={colors.error[600]} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          <View style={[styles.inputContainer, !!emailError && styles.inputContainerError]}>
            <Mail size={20} color={dark.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={dark.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>
          {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}

          <View style={[styles.inputContainer, !!passwordError && styles.inputContainerError]}>
            <Lock size={20} color={dark.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={dark.textMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {showPassword ? <EyeOff size={20} color={dark.textSecondary} /> : <Eye size={20} color={dark.textSecondary} />}
            </TouchableOpacity>
          </View>
          {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleEmailLogin}
            disabled={loading || googleLoading}>
            {loading ? <ActivityIndicator color={dark.bg} /> : <Text style={styles.loginButtonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading || googleLoading}>
          {googleLoading ? (
            <ActivityIndicator color={dark.textSecondary} />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/signup')}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg },
  content: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
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
  inputContainerError: { borderColor: colors.error[600], marginBottom: spacing.xs },
  fieldError: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.error[600], marginBottom: spacing.md, marginTop: -2 },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: dark.text, paddingVertical: spacing.md },
  eyeButton: { padding: spacing.sm },
  loginButton: {
    backgroundColor: gold[400], paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.sm,
  },
  loginButtonDisabled: { backgroundColor: dark.elevated },
  loginButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.bg },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  divider: { flex: 1, height: 1, backgroundColor: dark.border },
  dividerText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textMuted, marginHorizontal: spacing.md },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border,
    paddingVertical: spacing.md, borderRadius: borderRadius.lg, gap: spacing.sm,
  },
  googleButtonDisabled: { opacity: 0.6 },
  googleIconContainer: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: gold[400],
    justifyContent: 'center', alignItems: 'center',
  },
  googleIcon: { fontFamily: 'Inter_700Bold', fontSize: 14, color: dark.bg },
  googleButtonText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: dark.textSecondary },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: spacing['2xl'], gap: spacing.sm,
  },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.textSecondary },
  signUpLink: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: gold[400] },
});

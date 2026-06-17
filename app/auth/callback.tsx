import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { dark, gold } from '@/lib/theme';

export default function AuthCallbackScreen() {
  useEffect(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) {
      router.replace('/auth/login');
      return;
    }

    const hash = url.includes('#') ? url.split('#')[1] : '';
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            router.replace('/auth/login');
          } else {
            router.replace('/(tabs)');
          }
        });
    } else {
      router.replace('/auth/login');
    }
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={gold[400]} />
      <Text style={styles.text}>Completing sign-in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.textSecondary },
});

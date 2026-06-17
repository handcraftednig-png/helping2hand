import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { dark, gold } from '@/lib/theme';

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState('Completing sign-in...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const href = typeof window !== 'undefined' ? window.location.href : '';
    if (!href) {
      router.replace('/auth/login');
      return;
    }

    const url = new URL(href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const intent = url.searchParams.get('intent');

    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    const provider_token = hashParams.get('provider_token');
    const provider_refresh_token = hashParams.get('provider_refresh_token');
    const expiresIn = parseInt(hashParams.get('expires_in') ?? '3600', 10);

    if (!access_token || !refresh_token) {
      router.replace('/auth/login');
      return;
    }

    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      router.replace('/auth/login');
      return;
    }

    if (intent === 'classroom') {
      if (provider_token) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (uid) {
          const payload: Record<string, unknown> = {
            user_id: uid,
            access_token: provider_token,
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            connected_at: new Date().toISOString(),
          };
          if (provider_refresh_token) payload.refresh_token = provider_refresh_token;
          await supabase.from('classroom_connections').upsert(payload, { onConflict: 'user_id' });
          setMessage('Google Classroom connected — syncing...');
          await supabase.functions.invoke('classroom-sync');
        }
      } else {
        setMessage('Google did not grant Classroom access.');
      }
      router.replace('/(tabs)/profile');
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={gold[400]} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.textSecondary },
});

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // app/auth/callback.tsx parses the OAuth redirect and calls setSession()
    // itself (it also needs provider_token for Classroom). Supabase's own
    // detector runs in the background on page load and clears the URL hash
    // before the splash-blocked callback screen ever mounts, racing it out
    // from under it — so it must stay off on every platform.
    detectSessionInUrl: false,
  },
});

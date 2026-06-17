import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  connectGoogleClassroom: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const CLASSROOM_SCOPES =
  'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe first so we never miss a rapid sign-in/sign-out event on mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Cold-start hydration: if already signed in, no event fires, so read directly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const redirectTo = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { error: error as Error };
    if (!data?.url) return { error: new Error('No OAuth URL returned by Supabase') };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return { error: new Error('Google sign-in was cancelled') };
    }

    const hashParams = new URLSearchParams(new URL(result.url).hash.replace(/^#/, ''));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    if (!access_token || !refresh_token) {
      return { error: new Error('No session tokens returned from Google sign-in') };
    }

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: sessionError as Error | null };
  };

  const connectGoogleClassroom = async () => {
    const redirectTo = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes: CLASSROOM_SCOPES,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) return { error: error as Error };
    if (!data?.url) return { error: new Error('No OAuth URL returned by Supabase') };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return { error: new Error('Google Classroom connection was cancelled') };
    }

    const hashParams = new URLSearchParams(new URL(result.url).hash.replace(/^#/, ''));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    const provider_token = hashParams.get('provider_token');
    const provider_refresh_token = hashParams.get('provider_refresh_token');
    const expiresIn = parseInt(hashParams.get('expires_in') ?? '3600', 10);

    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }

    if (!provider_token) {
      return {
        error: new Error(
          'Google did not return Classroom access. Try disconnecting "Helping Hand AI" in your Google Account permissions and reconnecting.'
        ),
      };
    }

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return { error: new Error('Not signed in') };

    const payload: Record<string, unknown> = {
      user_id: uid,
      access_token: provider_token,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      connected_at: new Date().toISOString(),
    };
    if (provider_refresh_token) payload.refresh_token = provider_refresh_token;

    const { error: upsertError } = await supabase
      .from('classroom_connections')
      .upsert(payload, { onConflict: 'user_id' });

    return { error: upsertError as Error | null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        connectGoogleClassroom,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

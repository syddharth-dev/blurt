import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from './supabase';

type AuthState = {
  /** loading: reading the saved session at launch */
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  /** Reads the saved session and follows sign-in/out from then on. Call once at launch. */
  init: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  init: async () => {
    if (!supabase) {
      set({ status: 'signedOut', session: null });
      return;
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'signedIn' : 'signedOut' });
    });
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, status: data.session ? 'signedIn' : 'signedOut' });
  },
}));

/** The current access token, refreshed by Supabase when needed. */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

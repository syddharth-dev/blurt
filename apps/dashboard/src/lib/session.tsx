'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

type SessionState = { status: 'loading' | 'signedIn' | 'signedOut'; session: Session | null };

const SessionContext = createContext<SessionState>({ status: 'loading', session: null });

/** Follows the Supabase session (sign-in, sign-out, token refresh, invite links). */
export function SessionProvider({ children }: { children: ReactNode }) {
  // Without Supabase settings there's no session to wait for.
  const [state, setState] = useState<SessionState>(() => ({
    status: supabase ? 'loading' : 'signedOut',
    session: null,
  }));
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setState({ status: session ? 'signedIn' : 'signedOut', session }),
    );
    void supabase.auth
      .getSession()
      .then(({ data: d }) =>
        setState({ status: d.session ? 'signedIn' : 'signedOut', session: d.session }),
      );
    return () => data.subscription.unsubscribe();
  }, []);
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

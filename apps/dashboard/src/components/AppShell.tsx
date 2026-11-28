'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use, useEffect, type ReactNode } from 'react';
import { browser } from 'react-dom';
import { useMe } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { EmptyState } from './Pip';
import { Sidebar } from './Sidebar';
import { Button } from './ui';

/**
 * The signed-in dashboard. Teachers and admins only: students sign in with the same account
 * system, so they get a friendly "this is for teachers" page instead.
 */
export function AppShell({ children }: { children: ReactNode }) {
  use(browser('The sign-in session is stored in the browser.'));
  const { status } = useSession();
  const me = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status === 'signedOut') router.replace('/sign-in');
  }, [status, router]);

  async function signOut() {
    await supabase?.auth.signOut();
    queryClient.clear();
    router.replace('/sign-in');
  }

  if (status !== 'signedIn' || me.isPending) return <Loading />;

  if (me.isError) {
    return (
      <Centered>
        <EmptyState title="Can't reach Blurt!" body={me.error.message}>
          <Button onClick={() => void me.refetch()}>Try again</Button>
        </EmptyState>
      </Centered>
    );
  }

  if (me.data.role === 'STUDENT') {
    return (
      <Centered>
        <EmptyState
          title="This dashboard is for teachers"
          body="Your account is a student account. If you teach, ask your school's Blurt! admin to invite you."
        >
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </EmptyState>
      </Centered>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar role={me.data.role} name={me.data.name} onSignOut={() => void signOut()} />
      <main className="flex-1 p-s24">{children}</main>
    </div>
  );
}

export function Loading() {
  return (
    <Centered>
      <p role="status" className="text-ink2">
        Loading…
      </p>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-s24">{children}</div>;
}

import { Suspense, type ReactNode } from 'react';
import { AppShell, Loading } from '@/components/AppShell';

/** Everything behind sign-in. The shell renders only in the browser (it reads the session). */
export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

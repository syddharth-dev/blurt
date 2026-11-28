import { Suspense } from 'react';
import { SignInForm } from './SignInForm';

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-s24">
      <Suspense
        fallback={
          <p role="status" className="text-ink2">
            Loading…
          </p>
        }
      >
        <SignInForm />
      </Suspense>
    </main>
  );
}

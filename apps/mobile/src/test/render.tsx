import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

/** Renders with a fresh TanStack Query client (no retries, so failures show at once). */
export function renderWithProviders(ui: ReactElement) {
  // gcTime: Infinity, so no cache-cleanup timers keep Jest running after the tests.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

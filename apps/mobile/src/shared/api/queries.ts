import { QueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/session';
import { endpoints } from './endpoints';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export const queryKeys = {
  me: ['me'] as const,
  subjects: ['subjects'] as const,
  classes: ['classes'] as const,
  practice: ['practice'] as const,
  daily: (localDate: string) => ['daily', localDate] as const,
};

/** The student's profile (XP, level, streak). Undefined until signed in and loaded. */
export function useMe() {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return useQuery({ queryKey: queryKeys.me, queryFn: endpoints.me, enabled: signedIn });
}

/** Subjects and topics with lock state and mastered counts. */
export function useSubjects() {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return useQuery({ queryKey: queryKeys.subjects, queryFn: endpoints.subjects, enabled: signedIn });
}

/** The student's classes and the topics their teachers assigned (needs a connection). */
export function useClasses() {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return useQuery({ queryKey: queryKeys.classes, queryFn: endpoints.classes, enabled: signedIn });
}

/** Terms due for review (spaced repetition). Needs a connection. */
export function usePractice() {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return useQuery({ queryKey: queryKeys.practice, queryFn: endpoints.practice, enabled: signedIn });
}

/** Today's challenge, picked by the server for the phone's local date. */
export function useDaily(localDate: string) {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return useQuery({
    queryKey: queryKeys.daily(localDate),
    queryFn: () => endpoints.daily(localDate),
    enabled: signedIn,
  });
}

/** After a round, totals and mastery changed. */
export function refreshProgress() {
  void queryClient.invalidateQueries({ queryKey: queryKeys.me });
  void queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
  void queryClient.invalidateQueries({ queryKey: queryKeys.classes });
  void queryClient.invalidateQueries({ queryKey: queryKeys.practice });
  void queryClient.invalidateQueries({ queryKey: ['daily'] });
}

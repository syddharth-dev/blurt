'use client';

import { Me, StaffList } from '@blurt/shared/schemas';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useSession } from './session';

export const keys = { me: ['me'] as const, staff: ['staff'] as const };

export function useMe() {
  const { status } = useSession();
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api('/me', { schema: Me }),
    enabled: status === 'signedIn',
  });
}

export function useStaff(enabled: boolean) {
  return useQuery({
    queryKey: keys.staff,
    queryFn: () => api('/admin/teachers', { schema: StaffList }),
    enabled,
  });
}

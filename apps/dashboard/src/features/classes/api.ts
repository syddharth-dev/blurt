'use client';

import {
  TeacherClassDetail,
  TeacherClassList,
  TeacherTopicList,
  type AssignTopics,
  type UpdateClass,
} from '@blurt/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Data for the Classes pages (DATA_AND_API.md → Teacher: classes). */
export const classKeys = {
  list: ['teacher', 'classes'] as const,
  detail: (id: string) => ['teacher', 'class', id] as const,
  // Shared with the Topics pages, so both read the same cache.
  topics: ['teacher', 'topics'] as const,
  library: ['teacher', 'library'] as const,
};

export const useClasses = () =>
  useQuery({
    queryKey: classKeys.list,
    queryFn: () => api('/teacher/classes', { schema: TeacherClassList }),
  });

export const useClass = (id: string) =>
  useQuery({
    queryKey: classKeys.detail(id),
    queryFn: () => api(`/teacher/classes/${id}`, { schema: TeacherClassDetail }),
  });

/** Topics a class can be given: your published topics and the published starter library. */
export function useAssignableTopics() {
  const own = useQuery({
    queryKey: classKeys.topics,
    queryFn: () => api('/teacher/topics', { schema: TeacherTopicList }),
  });
  const library = useQuery({
    queryKey: classKeys.library,
    queryFn: () => api('/teacher/library', { schema: TeacherTopicList }),
  });
  return {
    own: (own.data?.topics ?? []).filter((t) => t.status === 'PUBLISHED'),
    drafts: (own.data?.topics ?? []).filter((t) => t.status === 'DRAFT'),
    library: library.data?.topics ?? [],
    isPending: own.isPending || library.isPending,
  };
}

export function useClassActions() {
  const qc = useQueryClient();
  const stored = (c: TeacherClassDetail) => {
    qc.setQueryData(classKeys.detail(c.id), c);
    void qc.invalidateQueries({ queryKey: classKeys.list });
    // The Topics list shows which classes each topic is assigned to.
    void qc.invalidateQueries({ queryKey: classKeys.topics });
    return c;
  };
  const run = (path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown) =>
    api(path, { method, body, schema: TeacherClassDetail }).then(stored);
  return {
    create: useMutation({
      mutationFn: (name: string) => run('/teacher/classes', 'POST', { name }),
    }),
    update: useMutation({
      mutationFn: ({ id, ...b }: UpdateClass & { id: string }) =>
        run(`/teacher/classes/${id}`, 'PATCH', b),
    }),
    assign: useMutation({
      mutationFn: ({ id, ...b }: AssignTopics & { id: string }) =>
        run(`/teacher/classes/${id}/topics`, 'PUT', b),
    }),
    removeStudent: useMutation({
      mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
        run(`/teacher/classes/${id}/students/${studentId}`, 'DELETE'),
    }),
  };
}

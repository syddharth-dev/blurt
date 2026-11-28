'use client';

import {
  ConfusableSuggestions,
  SubjectList,
  TeacherTerm,
  TeacherTopicDetail,
  TeacherTopicList,
  type CreateTerm,
  type CreateTopic,
  type UpdateTerm,
  type UpdateTopic,
} from '@blurt/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/api';

/** Data for the topics and term editor pages (DATA_AND_API.md → Teacher). */
export const topicKeys = {
  subjects: ['teacher', 'subjects'] as const,
  list: ['teacher', 'topics'] as const,
  library: ['teacher', 'library'] as const,
  topic: (id: string) => ['teacher', 'topic', id] as const,
  term: (id: string) => ['teacher', 'term', id] as const,
  confusables: (topicId: string, termId: string | undefined, answer: string) =>
    ['teacher', 'confusables', topicId, termId ?? 'new', answer] as const,
};

export const useSubjects = () =>
  useQuery({
    queryKey: topicKeys.subjects,
    queryFn: () => api('/teacher/subjects', { schema: SubjectList }),
    staleTime: Infinity,
  });

export const useTopics = () =>
  useQuery({
    queryKey: topicKeys.list,
    queryFn: () => api('/teacher/topics', { schema: TeacherTopicList }),
  });

export const useLibrary = () =>
  useQuery({
    queryKey: topicKeys.library,
    queryFn: () => api('/teacher/library', { schema: TeacherTopicList }),
  });

export const useTopic = (id: string) =>
  useQuery({
    queryKey: topicKeys.topic(id),
    queryFn: () => api(`/teacher/topics/${id}`, { schema: TeacherTopicDetail }),
  });

export const useTerm = (id: string | undefined) =>
  useQuery({
    queryKey: topicKeys.term(id ?? ''),
    queryFn: () => api(`/teacher/terms/${id}`, { schema: TeacherTerm }),
    enabled: !!id,
  });

export const useConfusableSuggestions = (
  topicId: string,
  termId: string | undefined,
  answer: string,
) =>
  useQuery({
    queryKey: topicKeys.confusables(topicId, termId, answer),
    queryFn: () =>
      api('/teacher/terms/confusable-suggestions', {
        method: 'POST',
        body: { answer, topicId, ...(termId ? { termId } : {}) },
        schema: ConfusableSuggestions,
      }),
    enabled: answer.trim().length >= 3,
    staleTime: 60_000,
  });

/** Topic mutations. Each one refreshes the list and stores the returned topic. */
export function useTopicActions() {
  const qc = useQueryClient();
  const stored = (t: TeacherTopicDetail) => {
    qc.setQueryData(topicKeys.topic(t.id), t);
    void qc.invalidateQueries({ queryKey: topicKeys.list });
    return t;
  };
  const run = (path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown) =>
    api(path, { method, body, schema: TeacherTopicDetail }).then(stored);

  return {
    create: useMutation({ mutationFn: (b: CreateTopic) => run('/teacher/topics', 'POST', b) }),
    update: useMutation({
      mutationFn: ({ id, ...b }: UpdateTopic & { id: string }) =>
        run(`/teacher/topics/${id}`, 'PATCH', b),
    }),
    archive: useMutation({ mutationFn: (id: string) => run(`/teacher/topics/${id}`, 'DELETE') }),
    duplicate: useMutation({
      mutationFn: (id: string) => run(`/teacher/topics/${id}/duplicate`, 'POST'),
    }),
    publish: useMutation({
      mutationFn: (id: string) => run(`/teacher/topics/${id}/publish`, 'POST'),
    }),
    reorder: useMutation({
      mutationFn: ({ id, termIds }: { id: string; termIds: string[] }) =>
        run(`/teacher/topics/${id}/terms/order`, 'PUT', { termIds }),
    }),
  };
}

export function useTermActions(topicId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: topicKeys.topic(topicId) });
    void qc.invalidateQueries({ queryKey: topicKeys.list });
  };
  const stored = (t: TeacherTerm) => {
    qc.setQueryData(topicKeys.term(t.id), t);
    refresh();
    return t;
  };
  return {
    create: useMutation({
      mutationFn: (b: CreateTerm) =>
        api(`/teacher/topics/${topicId}/terms`, {
          method: 'POST',
          body: b,
          schema: TeacherTerm,
        }).then(stored),
    }),
    update: useMutation({
      mutationFn: ({ id, ...b }: UpdateTerm & { id: string }) =>
        api(`/teacher/terms/${id}`, { method: 'PATCH', body: b, schema: TeacherTerm }).then(stored),
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        api(`/teacher/terms/${id}`, { method: 'DELETE', schema: z.unknown() }).then(refresh),
    }),
  };
}

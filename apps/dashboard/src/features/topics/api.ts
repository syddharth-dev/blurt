'use client';

import {
  ConfusableSuggestions,
  PICTURE_RULES,
  PictureUploadTicket,
  TeacherPicture,
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
import { supabase } from '@/lib/supabase';

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

// ── Pictures ─────────────────────────────────────────────────────────────────

const pictureKey = (id: string) => ['teacher', 'picture', id] as const;

/** A picture, polled every second while it's uploading or processing. */
export const usePicture = (id: string | null, initial?: TeacherPicture | null) =>
  useQuery({
    queryKey: pictureKey(id ?? ''),
    queryFn: () => api(`/teacher/pictures/${id}`, { schema: TeacherPicture }),
    enabled: !!id,
    initialData: initial && initial.id === id ? initial : undefined,
    refetchInterval: (q) =>
      q.state.data && (q.state.data.state === 'PROCESSING' || q.state.data.state === 'UPLOADING')
        ? 1000
        : false,
  });

export class UploadProblem extends Error {}

/**
 * Upload (TEACHER_DASHBOARD.md → "What happens when a teacher uploads a picture"): ask the API
 * for a signed URL, send the file straight to Supabase Storage, then tell the API to process it.
 */
export function useUploadPicture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const type = PICTURE_RULES.contentTypes.find((t) => t === file.type);
      if (!type) throw new UploadProblem('Use a PNG, JPG, WebP or SVG picture.');
      if (file.size > PICTURE_RULES.maxBytes) throw new UploadProblem('That file is over 5 MB.');
      if (!supabase) throw new UploadProblem("Uploads aren't set up in this dashboard.");
      const ticket = await api('/teacher/pictures/upload-url', {
        method: 'POST',
        body: { fileName: file.name.slice(0, 200), contentType: type, size: file.size },
        schema: PictureUploadTicket,
      });
      const { error } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: type });
      if (error) throw new UploadProblem("The upload didn't go through. Try again.");
      const picture = await api(`/teacher/pictures/${ticket.pictureId}/complete`, {
        method: 'POST',
        schema: TeacherPicture,
      });
      qc.setQueryData(pictureKey(picture.id), picture);
      return picture;
    },
  });
}

export function useUpdatePicture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, altText }: { id: string; altText: string }) =>
      api(`/teacher/pictures/${id}`, {
        method: 'PATCH',
        body: { altText },
        schema: TeacherPicture,
      }),
    onSuccess: (p) => qc.setQueryData(pictureKey(p.id), p),
  });
}

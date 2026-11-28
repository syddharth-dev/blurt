'use client';

import { CreateTopic, type TeacherTopicSummary } from '@blurt/shared/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmptyState } from '@/components/Pip';
import { Button, Card, Chip, Field, Input, Notice, Select, StatusChip } from '@/components/ui';
import { useLibrary, useSubjects, useTopicActions, useTopics } from './api';

export const GRADES = [6, 7, 8, 9, 10, 11, 12];

/** Topics (TEACHER_DASHBOARD.md → Pages 3): yours, a new-topic form, and the starter library. */
export function TopicsPage() {
  const topics = useTopics();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex max-w-5xl flex-col gap-s20">
      <div className="flex flex-wrap items-center justify-between gap-s12">
        <h1 className="font-display text-4xl text-night">Topics</h1>
        {!creating ? <Button onClick={() => setCreating(true)}>New topic</Button> : null}
      </div>

      {creating ? <NewTopic onCancel={() => setCreating(false)} /> : null}

      <Card className="flex flex-col gap-s12">
        <h2 className="font-display text-2xl text-night">Your topics</h2>
        {topics.isPending ? (
          <p role="status" className="text-ink2">
            Loading…
          </p>
        ) : topics.isError ? (
          <Notice tone="error">{topics.error.message}</Notice>
        ) : topics.data.topics.length === 0 ? (
          <EmptyState
            title="No topics yet"
            body="Start a new topic, or copy one from the starter library below and make it yours."
          />
        ) : (
          <TopicTable topics={topics.data.topics} />
        )}
      </Card>

      <Library />
    </div>
  );
}

function TopicTable({ topics }: { topics: TeacherTopicSummary[] }) {
  const actions = useTopicActions();
  const router = useRouter();
  return (
    <>
      {actions.duplicate.isError ? (
        <Notice tone="error">{actions.duplicate.error.message}</Notice>
      ) : null}
      {actions.archive.isError ? (
        <Notice tone="error">{actions.archive.error.message}</Notice>
      ) : null}
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-track text-xs tracking-wider text-ink2 uppercase">
            <th className="py-s8 font-bold">Topic</th>
            <th className="py-s8 font-bold">Subject</th>
            <th className="py-s8 font-bold">Grade</th>
            <th className="py-s8 font-bold">Terms</th>
            <th className="py-s8 font-bold">Status</th>
            <th className="py-s8 font-bold">Classes</th>
            <th className="py-s8">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {topics.map((t) => (
            <tr key={t.id} className="border-b border-track align-middle">
              <td className="py-s10">
                <Link href={`/topics/${t.id}`} className="font-bold text-violet hover:underline">
                  {t.title}
                </Link>
              </td>
              <td className="py-s10 text-night">{t.subject.name}</td>
              <td className="py-s10 text-night">{t.grade}</td>
              <td className="py-s10 text-night">
                {t.termCount}
                {t.termsNotReady ? (
                  <span className="ml-s8">
                    <Chip tone="coral">{t.termsNotReady} to fix</Chip>
                  </span>
                ) : null}
              </td>
              <td className="py-s10">
                <StatusChip status={t.status} />
              </td>
              <td className="py-s10 text-ink2">{t.classes.length ? t.classes.join(', ') : '—'}</td>
              <td className="py-s10 text-right whitespace-nowrap">
                <Button
                  variant="ghost"
                  disabled={actions.duplicate.isPending}
                  onClick={() =>
                    actions.duplicate.mutate(t.id, {
                      onSuccess: (c) => router.push(`/topics/${c.id}`),
                    })
                  }
                >
                  Duplicate
                </Button>
                <Button
                  variant="danger"
                  disabled={actions.archive.isPending}
                  onClick={() => {
                    if (window.confirm(`Archive "${t.title}"? Students won't see it any more.`))
                      actions.archive.mutate(t.id);
                  }}
                >
                  Archive
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function NewTopic({ onCancel }: { onCancel: () => void }) {
  const subjects = useSubjects();
  const { create } = useTopicActions();
  const router = useRouter();
  const form = useForm<CreateTopic>({
    resolver: zodResolver(CreateTopic),
    defaultValues: { title: '', subjectId: '', grade: 8, curriculumCode: '' },
  });
  const errors = form.formState.errors;

  return (
    <Card className="flex flex-col gap-s16">
      <h2 className="font-display text-2xl text-night">New topic</h2>
      <form
        noValidate
        className="grid gap-s16 md:grid-cols-2"
        onSubmit={form.handleSubmit((v) =>
          create.mutate(
            { ...v, curriculumCode: v.curriculumCode || undefined },
            { onSuccess: (t) => router.push(`/topics/${t.id}`) },
          ),
        )}
      >
        <Field label="Title" error={errors.title && 'Give the topic a title.'}>
          <Input placeholder="Atoms and ions" autoComplete="off" {...form.register('title')} />
        </Field>
        <Field label="Subject" error={errors.subjectId && 'Pick a subject.'}>
          <Select {...form.register('subjectId')}>
            <option value="">Choose…</option>
            {subjects.data?.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Grade">
          <Select {...form.register('grade', { valueAsNumber: true })}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Curriculum code (optional)" hint="e.g. S8MT-IIIa-b-8">
          <Input autoComplete="off" {...form.register('curriculumCode')} />
        </Field>
        <div className="flex gap-s8 md:col-span-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create topic'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
      {create.isError ? <Notice tone="error">{create.error.message}</Notice> : null}
    </Card>
  );
}

function Library() {
  const library = useLibrary();
  const { duplicate } = useTopicActions();
  const router = useRouter();
  if (library.isPending || library.isError || !library.data.topics.length) return null;
  return (
    <Card className="flex flex-col gap-s12">
      <div>
        <h2 className="font-display text-2xl text-night">Starter library</h2>
        <p className="text-ink2">Copy a topic to make it yours. The copy starts as a draft.</p>
      </div>
      {duplicate.isError ? <Notice tone="error">{duplicate.error.message}</Notice> : null}
      <ul className="grid gap-s12 md:grid-cols-2">
        {library.data.topics.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-s12 rounded-chip border-2 border-track p-s12"
          >
            <span>
              <span className="block font-bold text-night">{t.title}</span>
              <span className="text-sm text-ink2">
                {t.subject.name} · Grade {t.grade} · {t.termCount} terms
              </span>
            </span>
            <Button
              variant="secondary"
              disabled={duplicate.isPending}
              onClick={() =>
                duplicate.mutate(t.id, { onSuccess: (c) => router.push(`/topics/${c.id}`) })
              }
            >
              Make a copy
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

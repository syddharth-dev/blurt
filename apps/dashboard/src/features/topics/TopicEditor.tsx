'use client';

import { UpdateTopic, type TeacherTerm, type TeacherTopicDetail } from '@blurt/shared/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmptyState } from '@/components/Pip';
import { Button, Card, Chip, Field, Input, Notice, Select, StatusChip } from '@/components/ui';
import { useSubjects, useTopic, useTopicActions } from './api';
import { GRADES } from './TopicsPage';

/** Topic editor (TEACHER_DASHBOARD.md → Pages 4): details, the terms in order, publish. */
export function TopicEditor({ topicId }: { topicId: string }) {
  const topic = useTopic(topicId);
  if (topic.isPending)
    return (
      <p role="status" className="text-ink2">
        Loading…
      </p>
    );
  if (topic.isError) return <Notice tone="error">{topic.error.message}</Notice>;
  return <Editor topic={topic.data} />;
}

function Editor({ topic }: { topic: TeacherTopicDetail }) {
  const actions = useTopicActions();
  const router = useRouter();
  const archived = topic.status === 'ARCHIVED';

  return (
    <div className="flex max-w-5xl flex-col gap-s20">
      <Link href="/topics" className="self-start font-bold text-violet hover:underline">
        ← Topics
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-s12">
        <div className="flex items-center gap-s12">
          <h1 className="font-display text-4xl text-night">{topic.title}</h1>
          <StatusChip status={topic.status} />
        </div>
        <div className="flex gap-s8">
          <Button
            variant="secondary"
            disabled={actions.duplicate.isPending}
            onClick={() =>
              actions.duplicate.mutate(topic.id, {
                onSuccess: (c) => router.push(`/topics/${c.id}`),
              })
            }
          >
            Duplicate
          </Button>
          {!archived ? (
            <Button
              disabled={actions.publish.isPending}
              onClick={() => actions.publish.mutate(topic.id)}
            >
              {actions.publish.isPending
                ? 'Publishing…'
                : topic.status === 'PUBLISHED'
                  ? 'Publish new terms'
                  : 'Publish'}
            </Button>
          ) : null}
        </div>
      </div>

      {archived ? (
        <Notice tone="error">This topic is archived. Duplicate it to use it again.</Notice>
      ) : null}
      {actions.publish.isError ? (
        <Notice tone="error">{actions.publish.error.message}</Notice>
      ) : null}
      {actions.publish.isSuccess ? (
        <Notice tone="success">
          Published. Students in the classes it’s assigned to will see it (classes arrive next).
        </Notice>
      ) : null}

      {!archived ? <Details topic={topic} /> : null}
      <Terms topic={topic} readOnly={archived} />
    </div>
  );
}

function Details({ topic }: { topic: TeacherTopicDetail }) {
  const subjects = useSubjects();
  const { update } = useTopicActions();
  const form = useForm<UpdateTopic>({
    resolver: zodResolver(UpdateTopic),
    values: {
      title: topic.title,
      subjectId: topic.subject.id,
      grade: topic.grade,
      curriculumCode: topic.curriculumCode ?? '',
    },
  });
  const errors = form.formState.errors;

  return (
    <Card className="flex flex-col gap-s16">
      <h2 className="font-display text-2xl text-night">Details</h2>
      <form
        noValidate
        className="grid gap-s16 md:grid-cols-4"
        onSubmit={form.handleSubmit((v) => update.mutate({ id: topic.id, ...v }))}
      >
        <div className="md:col-span-2">
          <Field label="Title" error={errors.title && 'Give the topic a title.'}>
            <Input autoComplete="off" {...form.register('title')} />
          </Field>
        </div>
        <Field label="Subject">
          <Select {...form.register('subjectId')}>
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
        <div className="md:col-span-2">
          <Field label="Curriculum code (optional)">
            <Input autoComplete="off" {...form.register('curriculumCode')} />
          </Field>
        </div>
        <div className="flex items-end gap-s12 md:col-span-2">
          <Button
            type="submit"
            variant="secondary"
            disabled={!form.formState.isDirty || update.isPending}
          >
            {update.isPending ? 'Saving…' : 'Save details'}
          </Button>
          {update.isSuccess && !form.formState.isDirty ? (
            <span role="status" className="pb-s10 text-sm text-ink2">
              Saved.
            </span>
          ) : null}
        </div>
      </form>
      {update.isError ? <Notice tone="error">{update.error.message}</Notice> : null}
    </Card>
  );
}

/** The terms in play order. Drag a row, or use the arrow buttons (keyboard friendly). */
function Terms({ topic, readOnly }: { topic: TeacherTopicDetail; readOnly: boolean }) {
  const { reorder } = useTopicActions();
  const [dragging, setDragging] = useState<string | null>(null);
  const ids = topic.terms.map((t) => t.id);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id!);
    reorder.mutate({ id: topic.id, termIds: next });
  };

  return (
    <Card className="flex flex-col gap-s12">
      <div className="flex flex-wrap items-center justify-between gap-s12">
        <h2 className="font-display text-2xl text-night">Terms</h2>
        {!readOnly ? (
          <Link
            href={`/topics/${topic.id}/terms/new`}
            className="inline-flex min-h-11 items-center rounded-button bg-violet px-s20 font-display text-base text-white hover:bg-violet-ink"
          >
            Add term
          </Link>
        ) : null}
      </div>
      {reorder.isError ? <Notice tone="error">{reorder.error.message}</Notice> : null}
      {topic.terms.length === 0 ? (
        <EmptyState title="No terms yet" body="Add the first word students will name." />
      ) : (
        <ol className="flex flex-col gap-s8">
          {topic.terms.map((t, i) => (
            <li
              key={t.id}
              draggable={!readOnly}
              onDragStart={() => setDragging(t.id)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging) move(ids.indexOf(dragging), i);
                setDragging(null);
              }}
              className={`flex items-center gap-s12 rounded-chip border-2 p-s10 ${
                dragging === t.id ? 'border-violet bg-violet-tint' : 'border-track bg-white'
              }`}
            >
              <span aria-hidden="true" className="w-s24 text-center font-bold text-ink2">
                {i + 1}
              </span>
              <TermRow topicId={topic.id} term={t} />
              {!readOnly ? (
                <span className="flex">
                  <Button
                    variant="ghost"
                    aria-label={`Move ${t.display} up`}
                    disabled={i === 0 || reorder.isPending}
                    onClick={() => move(i, i - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Move ${t.display} down`}
                    disabled={i === ids.length - 1 || reorder.isPending}
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function TermRow({ topicId, term }: { topicId: string; term: TeacherTerm }) {
  return (
    <span className="flex flex-1 flex-wrap items-center gap-s8">
      <Link
        href={`/topics/${topicId}/terms/${term.id}`}
        className="font-bold text-violet hover:underline"
      >
        {term.display}
      </Link>
      <span className="text-sm text-ink2">{term.syllables}</span>
      <StatusChip status={term.status} />
      {term.problems.length ? (
        <Chip tone="coral">{term.problems.length} to fix</Chip>
      ) : (
        <Chip>Ready</Chip>
      )}
      {term.version > 1 ? <span className="text-xs text-ink2">v{term.version}</span> : null}
    </span>
  );
}

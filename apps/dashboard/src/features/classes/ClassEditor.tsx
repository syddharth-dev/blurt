'use client';

import type { TeacherClassDetail } from '@blurt/shared/schemas';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState } from '@/components/Pip';
import { Button, Card, Field, Input, Notice, Select, StatusChip } from '@/components/ui';
import { useAssignableTopics, useClass, useClassActions } from './api';

/** One class: name, join code, assigned topics with due dates, and the roster. */
export function ClassEditor({ classId }: { classId: string }) {
  const c = useClass(classId);
  if (c.isPending)
    return (
      <p role="status" className="text-ink2">
        Loading…
      </p>
    );
  if (c.isError) return <Notice tone="error">{c.error.message}</Notice>;
  return (
    <div className="flex max-w-4xl flex-col gap-s20">
      <Link href="/classes" className="self-start font-bold text-violet hover:underline">
        ← Classes
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-s12">
        <h1 className="font-display text-4xl text-night">{c.data.name}</h1>
        <Link
          href={`/classes/${c.data.id}/report`}
          className="inline-flex min-h-11 items-center rounded-button bg-violet px-s20 font-display text-base text-white hover:bg-violet-ink"
        >
          See report
        </Link>
      </div>
      <div className="grid gap-s20 md:grid-cols-2">
        <JoinCode c={c.data} />
        <Rename key={c.data.name} c={c.data} />
      </div>
      <Topics key={JSON.stringify(c.data.topics)} c={c.data} />
      <Roster c={c.data} />
    </div>
  );
}

function JoinCode({ c }: { c: TeacherClassDetail }) {
  const { update } = useClassActions();
  const [copied, setCopied] = useState(false);
  return (
    <Card className="flex flex-col gap-s10">
      <h2 className="font-display text-xl text-night">Join code</h2>
      <p
        aria-label={`Join code ${c.code.split('').join(' ')}`}
        className="font-display text-5xl tracking-widest text-violet"
      >
        {c.code}
      </p>
      <p className="text-sm text-ink2">
        Students open Blurt!, tap Topics, then “Join a class”, and type this.
      </p>
      <div className="flex flex-wrap gap-s8">
        <Button
          variant="secondary"
          onClick={() =>
            void navigator.clipboard.writeText(c.code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
          }
        >
          {copied ? 'Copied' : 'Copy code'}
        </Button>
        <Button
          variant="ghost"
          disabled={update.isPending}
          onClick={() => {
            if (
              window.confirm(
                'Make a new code? The old one stops working. Students already in the class stay in.',
              )
            )
              update.mutate({ id: c.id, newCode: true });
          }}
        >
          New code
        </Button>
      </div>
      {update.isError ? <Notice tone="error">{update.error.message}</Notice> : null}
    </Card>
  );
}

function Rename({ c }: { c: TeacherClassDetail }) {
  const { update } = useClassActions();
  const [name, setName] = useState(c.name);
  return (
    <Card>
      <form
        className="flex flex-col gap-s10"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && name.trim() !== c.name) update.mutate({ id: c.id, name: name.trim() });
        }}
      >
        <h2 className="font-display text-xl text-night">Class name</h2>
        <Field label="Name">
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          className="self-start"
          disabled={update.isPending || !name.trim() || name.trim() === c.name}
        >
          Rename
        </Button>
      </form>
    </Card>
  );
}

type Row = {
  topicId: string;
  title: string;
  subject: string;
  status: string;
  dueOn: string | null;
};

/** Assigned topics are edited here, then saved together. */
function Topics({ c }: { c: TeacherClassDetail }) {
  const { assign } = useClassActions();
  const choices = useAssignableTopics();
  const [rows, setRows] = useState<Row[]>(
    c.topics.map((t) => ({
      topicId: t.id,
      title: t.title,
      subject: t.subject,
      status: t.status,
      dueOn: t.dueOn,
    })),
  );
  const [adding, setAdding] = useState('');
  const taken = new Set(rows.map((r) => r.topicId));
  const options = [
    { label: 'Your published topics', topics: choices.own },
    { label: 'Starter library', topics: choices.library },
  ];
  const dirty =
    JSON.stringify(rows.map((r) => [r.topicId, r.dueOn])) !==
    JSON.stringify(c.topics.map((t) => [t.id, t.dueOn]));

  const add = () => {
    const t = [...choices.own, ...choices.library].find((x) => x.id === adding);
    if (!t) return;
    setRows([
      ...rows,
      { topicId: t.id, title: t.title, subject: t.subject.name, status: t.status, dueOn: null },
    ]);
    setAdding('');
  };

  return (
    <Card className="flex flex-col gap-s12">
      <h2 className="font-display text-2xl text-night">Assigned topics</h2>
      <p className="text-sm text-ink2">
        Students see these first in the app, soonest due date on top, and they’re never locked by
        level.
      </p>
      {rows.length === 0 ? (
        <p className="text-ink2">No topics yet. Add one below.</p>
      ) : (
        <ul className="flex flex-col gap-s8">
          {rows.map((r, i) => (
            <li
              key={r.topicId}
              className="flex flex-wrap items-center gap-s12 rounded-chip border-2 border-track p-s10"
            >
              <span className="flex-1">
                <span className="block font-bold text-night">{r.title}</span>
                <span className="text-sm text-ink2">{r.subject}</span>
              </span>
              {r.status !== 'PUBLISHED' ? <StatusChip status={r.status as 'DRAFT'} /> : null}
              <label className="flex items-center gap-s8 text-sm text-ink2">
                Due
                <Input
                  type="date"
                  value={r.dueOn ?? ''}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) => (j === i ? { ...x, dueOn: e.target.value || null } : x)),
                    )
                  }
                />
              </label>
              <Button
                variant="danger"
                aria-label={`Remove ${r.title}`}
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-s8">
        <div className="min-w-64 flex-1">
          <Field
            label="Add a topic"
            hint={choices.drafts.length ? 'Drafts appear here once published.' : undefined}
          >
            <Select value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Choose…</option>
              {options.map((g) =>
                g.topics.some((t) => !taken.has(t.id)) ? (
                  <optgroup key={g.label} label={g.label}>
                    {g.topics
                      .filter((t) => !taken.has(t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} · {t.subject.name}
                        </option>
                      ))}
                  </optgroup>
                ) : null,
              )}
            </Select>
          </Field>
        </div>
        <Button variant="secondary" disabled={!adding} onClick={add}>
          Add
        </Button>
      </div>

      <div className="flex items-center gap-s12 border-t-2 border-track pt-s12">
        <Button
          disabled={!dirty || assign.isPending}
          onClick={() =>
            assign.mutate({
              id: c.id,
              topics: rows.map((r) => ({ topicId: r.topicId, dueOn: r.dueOn })),
            })
          }
        >
          {assign.isPending ? 'Saving…' : 'Save topics'}
        </Button>
        {assign.isSuccess && !dirty ? (
          <span role="status" className="text-sm text-ink2">
            Saved. Students see the changes next time they open Topics.
          </span>
        ) : null}
      </div>
      {assign.isError ? <Notice tone="error">{assign.error.message}</Notice> : null}
    </Card>
  );
}

function Roster({ c }: { c: TeacherClassDetail }) {
  const { removeStudent } = useClassActions();
  return (
    <Card className="flex flex-col gap-s12">
      <h2 className="font-display text-2xl text-night">Students ({c.studentCount})</h2>
      {c.students.length === 0 ? (
        <EmptyState
          title="No students yet"
          body={`Share the code ${c.code}. Students appear here once they join.`}
        />
      ) : (
        <ul className="flex flex-col">
          {c.students.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-s12 border-b border-track py-s8"
            >
              <span>
                <span className="font-bold text-night">{s.name}</span>
                <span className="ml-s8 text-sm text-ink2">
                  joined {new Date(s.joinedAt).toLocaleDateString()}
                </span>
              </span>
              <Button
                variant="danger"
                disabled={removeStudent.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove ${s.name} from ${c.name}? They can rejoin with the code.`,
                    )
                  )
                    removeStudent.mutate({ id: c.id, studentId: s.id });
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {removeStudent.isError ? <Notice tone="error">{removeStudent.error.message}</Notice> : null}
    </Card>
  );
}

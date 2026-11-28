'use client';

import { CreateClass } from '@blurt/shared/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { EmptyState } from '@/components/Pip';
import { Button, Card, Field, Input, Notice } from '@/components/ui';
import { useClassActions, useClasses } from './api';

/** Classes (TEACHER_DASHBOARD.md → Pages 7): your classes and a new-class form. */
export function ClassesPage() {
  const classes = useClasses();
  return (
    <div className="flex max-w-4xl flex-col gap-s20">
      <h1 className="font-display text-4xl text-night">Classes</h1>
      <NewClass />
      <Card className="flex flex-col gap-s12">
        <h2 className="font-display text-2xl text-night">Your classes</h2>
        {classes.isPending ? (
          <p role="status" className="text-ink2">
            Loading…
          </p>
        ) : classes.isError ? (
          <Notice tone="error">{classes.error.message}</Notice>
        ) : classes.data.classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            body="Create a class, then give students its code. They type it in the app to join."
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-track text-xs tracking-wider text-ink2 uppercase">
                <th className="py-s8 font-bold">Class</th>
                <th className="py-s8 font-bold">Join code</th>
                <th className="py-s8 font-bold">Students</th>
                <th className="py-s8 font-bold">Topics</th>
              </tr>
            </thead>
            <tbody>
              {classes.data.classes.map((c) => (
                <tr key={c.id} className="border-b border-track">
                  <td className="py-s10">
                    <Link
                      href={`/classes/${c.id}`}
                      className="font-bold text-violet hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-s10 font-display text-lg tracking-widest text-night">
                    {c.code}
                  </td>
                  <td className="py-s10 text-night">{c.studentCount}</td>
                  <td className="py-s10 text-night">{c.topicCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function NewClass() {
  const { create } = useClassActions();
  const router = useRouter();
  const form = useForm<CreateClass>({
    resolver: zodResolver(CreateClass),
    defaultValues: { name: '' },
  });
  return (
    <Card className="flex flex-col gap-s12">
      <h2 className="font-display text-2xl text-night">New class</h2>
      <form
        noValidate
        className="flex flex-col gap-s12 md:flex-row md:items-start"
        onSubmit={form.handleSubmit((v) =>
          create.mutate(v.name, { onSuccess: (c) => router.push(`/classes/${c.id}`) }),
        )}
      >
        <div className="flex-1">
          <Field label="Class name" error={form.formState.errors.name && 'Give the class a name.'}>
            <Input autoComplete="off" placeholder="Grade 8 – Rizal" {...form.register('name')} />
          </Field>
        </div>
        <Button type="submit" className="md:mt-s20" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create class'}
        </Button>
      </form>
      {create.isError ? <Notice tone="error">{create.error.message}</Notice> : null}
    </Card>
  );
}

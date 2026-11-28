'use client';

import { InviteResult, InviteTeacher } from '@blurt/shared/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { EmptyState } from '@/components/Pip';
import { Button, Card, Field, Input, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { keys, useMe, useStaff } from '@/lib/queries';

const RESULT_COPY: Record<InviteResult['status'], (email: string) => string> = {
  invited: (e) => `Invite sent to ${e}. They'll get an email to open the dashboard.`,
  promoted: (e) => `${e} already had an account. They're a teacher now.`,
  'already-staff': (e) => `${e} is already a teacher or admin.`,
};

/** Admins invite teachers (TEACHER_DASHBOARD.md → Roles). Teacher accounts never come from sign-up. */
export default function TeachersPage() {
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';
  const staff = useStaff(isAdmin);
  const queryClient = useQueryClient();
  const form = useForm<InviteTeacher>({
    resolver: zodResolver(InviteTeacher),
    defaultValues: { email: '' },
  });
  const invite = useMutation({
    mutationFn: (body: InviteTeacher) =>
      api('/admin/teachers/invite', { method: 'POST', body, schema: InviteResult }),
    onSuccess: () => {
      form.reset({ email: '', name: undefined });
      void queryClient.invalidateQueries({ queryKey: keys.staff });
    },
  });

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState
          title="Admins only"
          body="Only your school's Blurt! admin can invite teachers."
        />
      </Card>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-s20">
      <h1 className="font-display text-4xl text-night">Teachers</h1>

      <Card className="flex flex-col gap-s16">
        <h2 className="font-display text-2xl text-night">Invite a teacher</h2>
        <form
          noValidate
          className="flex flex-col gap-s16 md:flex-row md:items-start"
          onSubmit={form.handleSubmit((values) =>
            invite.mutate({ ...values, name: values.name || undefined }),
          )}
        >
          <div className="flex-1">
            <Field
              label="Email"
              error={form.formState.errors.email?.message && 'Enter a valid email address.'}
            >
              <Input
                type="email"
                autoComplete="off"
                placeholder="teacher@school.edu"
                {...form.register('email')}
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Name (optional)" hint="How they're greeted. They can change it later.">
              <Input autoComplete="off" placeholder="Ms Reyes" {...form.register('name')} />
            </Field>
          </div>
          <Button type="submit" className="md:mt-s20" disabled={invite.isPending}>
            {invite.isPending ? 'Sending…' : 'Send invite'}
          </Button>
        </form>
        {invite.isSuccess ? (
          <Notice tone="success">
            {RESULT_COPY[invite.data.status](invite.data.teacher.email ?? '')}
          </Notice>
        ) : null}
        {invite.isError ? <Notice tone="error">{invite.error.message}</Notice> : null}
      </Card>

      <Card className="flex flex-col gap-s12">
        <h2 className="font-display text-2xl text-night">Teachers and admins</h2>
        {staff.isPending ? (
          <p role="status" className="text-ink2">
            Loading…
          </p>
        ) : staff.isError ? (
          <Notice tone="error">{staff.error.message}</Notice>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-track text-xs tracking-wider text-ink2 uppercase">
                <th className="py-s8 font-bold">Name</th>
                <th className="py-s8 font-bold">Email</th>
                <th className="py-s8 font-bold">Role</th>
              </tr>
            </thead>
            <tbody>
              {staff.data.staff.map((s) => (
                <tr key={s.id} className="border-b border-track">
                  <td className="py-s10 font-bold text-night">{s.name}</td>
                  <td className="py-s10 text-ink2">{s.email ?? '—'}</td>
                  <td className="py-s10 text-night">{s.role === 'ADMIN' ? 'Admin' : 'Teacher'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

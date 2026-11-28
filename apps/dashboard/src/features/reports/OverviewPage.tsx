'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/Pip';
import { Card, Notice } from '@/components/ui';
import { useMe } from '@/lib/queries';
import { useOverview } from './api';
import { AccuracyBar, TermsTable, when } from './parts';

/** Overview (TEACHER_DASHBOARD.md → Pages 2): your classes this week, recent rounds, most-missed terms. */
export function OverviewPage() {
  const me = useMe();
  const overview = useOverview();
  return (
    <div className="flex max-w-5xl flex-col gap-s20">
      <h1 className="font-display text-4xl text-night">Hi, {me.data?.name ?? 'there'}.</h1>
      {overview.isPending ? (
        <p role="status" className="text-ink2">
          Loading…
        </p>
      ) : overview.isError ? (
        <Notice tone="error">{overview.error.message}</Notice>
      ) : overview.data.classes.length === 0 ? (
        <Card>
          <EmptyState
            title="No classes yet"
            body="Create a topic, then a class with a join code. Your students’ results show up here."
          >
            <Link href="/classes" className="font-bold text-violet hover:underline">
              Go to Classes
            </Link>
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-s12">
            <h2 className="font-display text-2xl text-night">This week</h2>
            <ul className="grid gap-s12 md:grid-cols-2">
              {overview.data.classes.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-s8 rounded-chip border-2 border-track p-s12"
                >
                  <span className="flex items-center justify-between gap-s8">
                    <Link
                      href={`/classes/${c.id}/report`}
                      className="font-bold text-violet hover:underline"
                    >
                      {c.name}
                    </Link>
                    <AccuracyBar value={c.accuracyThisWeek} />
                  </span>
                  <span className="text-sm text-ink2">
                    {c.activeThisWeek} of {c.studentCount} students played · {c.roundsThisWeek}{' '}
                    {c.roundsThisWeek === 1 ? 'round' : 'rounds'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col gap-s12">
            <h2 className="font-display text-2xl text-night">Most-missed this week</h2>
            <TermsTable
              terms={overview.data.missedThisWeek}
              extra="className"
              empty={<p className="text-ink2">No misses this week.</p>}
            />
          </Card>

          <Card className="flex flex-col gap-s12">
            <h2 className="font-display text-2xl text-night">Recent rounds</h2>
            {overview.data.recent.length === 0 ? (
              <p className="text-ink2">No finished rounds on your classes’ topics yet.</p>
            ) : (
              <ul className="flex flex-col">
                {overview.data.recent.map((r, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-baseline justify-between gap-s8 border-b border-track py-s8"
                  >
                    <span className="text-night">
                      <span className="font-bold">{r.studentName}</span> played {r.topic}{' '}
                      <span className="text-ink2">({r.className})</span>
                    </span>
                    <span className="text-sm text-ink2">
                      <span className="font-bold text-night tabular-nums">
                        {r.correct}/{r.total}
                      </span>{' '}
                      · {when(r.finishedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

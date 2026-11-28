'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/Pip';
import { Card, Notice } from '@/components/ui';
import { useOverview } from './api';
import { AccuracyBar } from './parts';

/** Reports: pick a class. */
export function ReportsIndex() {
  const overview = useOverview();
  return (
    <div className="flex max-w-4xl flex-col gap-s20">
      <h1 className="font-display text-4xl text-night">Reports</h1>
      <Card className="flex flex-col gap-s12">
        {overview.isPending ? (
          <p role="status" className="text-ink2">
            Loading…
          </p>
        ) : overview.isError ? (
          <Notice tone="error">{overview.error.message}</Notice>
        ) : overview.data.classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            body="Reports appear once you have a class and students play."
          />
        ) : (
          <ul className="flex flex-col">
            {overview.data.classes.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-s12 border-b border-track py-s10"
              >
                <Link
                  href={`/classes/${c.id}/report`}
                  className="font-bold text-violet hover:underline"
                >
                  {c.name}
                </Link>
                <span className="flex items-center gap-s12 text-sm text-ink2">
                  This week <AccuracyBar value={c.accuracyThisWeek} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

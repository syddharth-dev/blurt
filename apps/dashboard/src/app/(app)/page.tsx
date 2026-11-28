'use client';

import { EmptyState } from '@/components/Pip';
import { Card } from '@/components/ui';
import { useMe } from '@/lib/queries';

/** Overview (TEACHER_DASHBOARD.md → 2). Classes, activity and most-missed terms arrive with classes and reports. */
export default function OverviewPage() {
  const me = useMe();
  return (
    <div className="flex max-w-4xl flex-col gap-s20">
      <h1 className="font-display text-4xl text-night">Hi, {me.data?.name ?? 'there'}.</h1>
      <Card>
        <EmptyState
          title="Your classes will show up here"
          body="Next you'll create topics and terms, then classes with join codes for your students."
        />
      </Card>
    </div>
  );
}

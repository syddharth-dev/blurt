'use client';

import type { ReportRange } from '@blurt/shared/schemas';
import Link from 'next/link';
import { useState } from 'react';
import { Card, Notice } from '@/components/ui';
import { useStudentReport } from './api';
import { percent, RangePicker, Stat, TermsTable, when } from './parts';

/** One student in one class: every term they've tried, weakest first. */
export function StudentReportPage({ classId, studentId }: { classId: string; studentId: string }) {
  const [range, setRange] = useState<ReportRange>('30d');
  const report = useStudentReport(classId, studentId, range);
  return (
    <div className="flex max-w-5xl flex-col gap-s20">
      <Link
        href={`/classes/${classId}/report`}
        className="self-start font-bold text-violet hover:underline"
      >
        ← {report.data ? `${report.data.className} report` : 'Class report'}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-s12">
        <h1 className="font-display text-4xl text-night">
          {report.data?.student.name ?? 'Student'}
        </h1>
        <RangePicker value={range} onChange={setRange} />
      </div>
      {report.isPending ? (
        <p role="status" className="text-ink2">
          Loading…
        </p>
      ) : report.isError ? (
        <Notice tone="error">{report.error.message}</Notice>
      ) : (
        <>
          <div className="grid gap-s12 sm:grid-cols-3">
            <Stat label="Accuracy" value={percent(report.data.summary.accuracy)} />
            <Stat label="Rounds" value={String(report.data.summary.rounds)} />
            <Stat label="Last played" value={when(report.data.summary.lastPlayedAt)} />
          </div>
          <Card className="flex flex-col gap-s12">
            <h2 className="font-display text-2xl text-night">Terms, weakest first</h2>
            <TermsTable
              terms={report.data.terms}
              empty={<p className="text-ink2">No answers on this class’s topics in this range.</p>}
            />
          </Card>
        </>
      )}
    </div>
  );
}

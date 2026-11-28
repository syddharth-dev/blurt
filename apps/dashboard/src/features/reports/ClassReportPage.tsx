'use client';

import type { ReportRange } from '@blurt/shared/schemas';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState } from '@/components/Pip';
import { Card, Notice } from '@/components/ui';
import { useClassReport } from './api';
import { AccuracyBar, percent, RangePicker, Stat, TermsTable, when } from './parts';

/** A class's report (TEACHER_DASHBOARD.md → Pages 8). */
export function ClassReportPage({ classId, className }: { classId: string; className?: string }) {
  const [range, setRange] = useState<ReportRange>('7d');
  const report = useClassReport(classId, range);

  return (
    <div className="flex max-w-5xl flex-col gap-s20">
      <Link
        href={`/classes/${classId}`}
        className="self-start font-bold text-violet hover:underline"
      >
        ← {className ?? 'Class'}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-s12">
        <h1 className="font-display text-4xl text-night">
          Report{className ? `: ${className}` : ''}
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
          <div className="grid gap-s12 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Accuracy"
              value={percent(report.data.summary.accuracy)}
              note="Right answers out of all answers"
            />
            <Stat
              label="Active students"
              value={`${report.data.summary.activeStudents}/${report.data.summary.students}`}
              note="Played at least once"
            />
            <Stat label="Rounds" value={String(report.data.summary.rounds)} />
            <Stat
              label="Answers"
              value={String(report.data.summary.answers)}
              note="Skips not counted"
            />
          </div>

          <Card className="flex flex-col gap-s12">
            <h2 className="font-display text-2xl text-night">Most-missed terms</h2>
            <TermsTable
              terms={report.data.missedTerms}
              empty={<p className="text-ink2">No misses in this range. Nice.</p>}
            />
          </Card>

          <Card className="flex flex-col gap-s12">
            <h2 className="font-display text-2xl text-night">Students</h2>
            {report.data.students.length === 0 ? (
              <EmptyState
                title="No students yet"
                body="Share the class code. Results appear once students play."
              />
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-track text-xs tracking-wider text-ink2 uppercase">
                    <th className="py-s8 font-bold">Student</th>
                    <th className="py-s8 font-bold">Accuracy</th>
                    <th className="py-s8 font-bold">Rounds</th>
                    <th className="py-s8 font-bold">To practise</th>
                    <th className="py-s8 font-bold">Last played</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.students.map((s) => (
                    <tr key={s.id} className="border-b border-track">
                      <td className="py-s10">
                        <Link
                          href={`/classes/${classId}/students/${s.id}`}
                          className="font-bold text-violet hover:underline"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="py-s10">
                        <AccuracyBar value={s.accuracy} />
                      </td>
                      <td className="py-s10 text-night tabular-nums">{s.rounds}</td>
                      <td className="py-s10 text-night tabular-nums">{s.toPractise}</td>
                      <td className="py-s10 text-ink2">{when(s.lastPlayedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-sm text-ink2">
              Weakest first. Counts answers on this class’s topics, including practice. “To
              practise”: terms whose latest try wasn’t right.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

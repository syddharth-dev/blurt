'use client';

import type { MissedTerm, ReportRange } from '@blurt/shared/schemas';
import type { ReactNode } from 'react';

/** Report building blocks. One series and one hue (violet), and every value is also text. */

export const percent = (a: number | null) => (a === null ? '—' : `${Math.round(a * 100)}%`);

export function when(iso: string | null): string {
  if (!iso) return 'Not yet';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

/** A headline number with its label (a stat tile: no chart needed). */
export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-s4 rounded-chip bg-white p-s16 shadow-card">
      <span className="text-xs font-bold tracking-wider text-ink2 uppercase">{label}</span>
      <span className="font-display text-4xl text-night">{value}</span>
      {note ? <span className="text-sm text-ink2">{note}</span> : null}
    </div>
  );
}

/** Accuracy as a thin bar with the number beside it; the number carries the meaning. */
export function AccuracyBar({ value }: { value: number | null }) {
  return (
    <span className="flex items-center gap-s8">
      <span
        className="h-s8 w-24 overflow-hidden rounded-full bg-track"
        title={value === null ? 'No answers yet' : `${percent(value)} right`}
        aria-hidden="true"
      >
        {value !== null ? (
          <span
            className="block h-full rounded-full bg-violet"
            style={{ width: `${Math.max(value * 100, 2)}%` }}
          />
        ) : null}
      </span>
      <span className="w-10 text-right text-sm font-bold text-night tabular-nums">
        {percent(value)}
      </span>
    </span>
  );
}

const RANGES: Array<[ReportRange, string]> = [
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['all', 'All time'],
];

export function RangePicker({
  value,
  onChange,
}: {
  value: ReportRange;
  onChange: (r: ReportRange) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Time range" className="flex gap-s6">
      {RANGES.map(([r, label]) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={value === r}
          onClick={() => onChange(r)}
          className={`min-h-11 rounded-chip border-2 px-s12 text-sm font-bold ${
            value === r
              ? 'border-violet bg-violet-tint text-violet-ink'
              : 'border-track bg-white text-night'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Terms with misses: what students said instead is the useful part for teaching. */
export function TermsTable({
  terms,
  empty,
  extra,
}: {
  terms: Array<MissedTerm & { className?: string }>;
  empty: ReactNode;
  extra?: 'className';
}) {
  if (!terms.length) return <>{empty}</>;
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b-2 border-track text-xs tracking-wider text-ink2 uppercase">
          <th className="py-s8 font-bold">Term</th>
          {extra ? <th className="py-s8 font-bold">Class</th> : null}
          <th className="py-s8 font-bold">Right</th>
          <th className="py-s8 font-bold">Misses</th>
          <th className="py-s8 font-bold">What they said instead</th>
        </tr>
      </thead>
      <tbody>
        {terms.map((t) => (
          <tr key={`${t.termId}-${t.className ?? ''}`} className="border-b border-track align-top">
            <td className="py-s10">
              <span className="block font-bold text-night">{t.display}</span>
              <span className="text-sm text-ink2">{t.topic}</span>
            </td>
            {extra ? <td className="py-s10 text-night">{t.className}</td> : null}
            <td className="py-s10">
              <AccuracyBar value={t.accuracy} />
              <span className="text-xs text-ink2">
                {t.correct} of {t.answers} answers
              </span>
            </td>
            <td className="py-s10 font-bold text-night tabular-nums">{t.misses}</td>
            <td className="py-s10">
              {t.heard.length ? (
                <span className="flex flex-wrap gap-s6">
                  {t.heard.map((h) => (
                    <span
                      key={h.text}
                      className="rounded-full bg-lilac px-s10 py-s4 text-sm text-night"
                    >
                      “{h.text}”
                      {h.count > 1 ? <span className="text-ink2"> ×{h.count}</span> : null}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-sm text-ink2">Skipped, not said</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

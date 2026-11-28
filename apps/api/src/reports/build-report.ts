/**
 * Report maths, kept pure so it's easy to test (TEACHER_DASHBOARD.md → Reports).
 * answers = spoken or typed attempts; accuracy = right ÷ answers; misses = close + wrong + skips.
 */
import type { ClassReport, MissedTerm } from '@blurt/shared/schemas';
import { normalizeForDisplay } from '@blurt/shared/matcher';

export type AttemptRow = {
  studentId: string;
  roundId: string;
  termId: string;
  /** correct | close | wrong | skipped */
  verdict: string;
  /** What the recognizer heard first (or what was typed); null for skips */
  heard: string | null;
  createdAt: Date;
};

export type TermMeta = { termId: string; display: string; topic: string };
export type StudentMeta = { id: string; name: string };

const HEARD_LIMIT = 5;
const isAnswer = (v: string) => v === 'correct' || v === 'close' || v === 'wrong';
const isMiss = (v: string) => v !== 'correct';
const ratio = (a: number, b: number) => (b ? a / b : null);

/** Per-term totals, with what was said instead (most common first). */
export function termStats(rows: AttemptRow[], terms: Map<string, TermMeta>): MissedTerm[] {
  const byTerm = new Map<string, AttemptRow[]>();
  for (const r of rows) byTerm.set(r.termId, [...(byTerm.get(r.termId) ?? []), r]);
  return [...byTerm.entries()].map(([termId, list]) => {
    const meta = terms.get(termId);
    const answers = list.filter((r) => isAnswer(r.verdict)).length;
    const correct = list.filter((r) => r.verdict === 'correct').length;
    const heardCounts = new Map<string, number>();
    for (const r of list) {
      if (r.verdict !== 'close' && r.verdict !== 'wrong') continue;
      const text = normalizeForDisplay(r.heard ?? '');
      if (text) heardCounts.set(text, (heardCounts.get(text) ?? 0) + 1);
    }
    return {
      termId,
      display: meta?.display ?? termId,
      topic: meta?.topic ?? '',
      answers,
      correct,
      misses: list.filter((r) => isMiss(r.verdict)).length,
      accuracy: ratio(correct, answers),
      heard: [...heardCounts.entries()]
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
        .slice(0, HEARD_LIMIT),
    };
  });
}

/** Most misses first, then lowest accuracy. */
export const byMostMissed = (a: MissedTerm, b: MissedTerm) =>
  b.misses - a.misses ||
  (a.accuracy ?? 1) - (b.accuracy ?? 1) ||
  a.display.localeCompare(b.display);

/** Terms whose latest try wasn't right. */
function toPractise(rows: AttemptRow[]): number {
  const latest = new Map<string, AttemptRow>();
  for (const r of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    latest.set(r.termId, r);
  }
  return [...latest.values()].filter((r) => r.verdict !== 'correct').length;
}

export function summarize(rows: AttemptRow[]) {
  const answers = rows.filter((r) => isAnswer(r.verdict));
  const correct = answers.filter((r) => r.verdict === 'correct').length;
  const last = rows.reduce<Date | null>((m, r) => (!m || r.createdAt > m ? r.createdAt : m), null);
  return {
    rounds: new Set(rows.map((r) => r.roundId)).size,
    answers: answers.length,
    accuracy: ratio(correct, answers.length),
    lastPlayedAt: last ? last.toISOString() : null,
  };
}

export function buildClassReport(input: {
  range: ClassReport['range'];
  since: Date | null;
  students: StudentMeta[];
  terms: Map<string, TermMeta>;
  rows: AttemptRow[];
}): ClassReport {
  const { rows } = input;
  const total = summarize(rows);
  const byStudent = new Map<string, AttemptRow[]>();
  for (const r of rows) byStudent.set(r.studentId, [...(byStudent.get(r.studentId) ?? []), r]);

  return {
    range: input.range,
    since: input.since ? input.since.toISOString() : null,
    summary: {
      students: input.students.length,
      activeStudents: byStudent.size,
      rounds: total.rounds,
      answers: total.answers,
      accuracy: total.accuracy,
    },
    missedTerms: termStats(rows, input.terms)
      .filter((t) => t.misses > 0)
      .sort(byMostMissed)
      .slice(0, 10),
    students: input.students
      .map((s) => {
        const mine = byStudent.get(s.id) ?? [];
        const { rounds, answers, accuracy, lastPlayedAt } = summarize(mine);
        return {
          id: s.id,
          name: s.name,
          rounds,
          answers,
          accuracy,
          lastPlayedAt,
          toPractise: toPractise(mine),
        };
      })
      // Students who need help first: lowest accuracy, then those who haven't played.
      .sort((a, b) => (a.accuracy ?? 2) - (b.accuracy ?? 2) || a.name.localeCompare(b.name)),
  };
}

const DAY = 86_400_000;
export function sinceFor(range: ClassReport['range'], now = new Date()): Date | null {
  if (range === 'all') return null;
  return new Date(now.getTime() - (range === '7d' ? 7 : 30) * DAY);
}

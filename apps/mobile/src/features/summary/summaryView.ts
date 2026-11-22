import { starsFor } from '@blurt/shared/progress';
import type { FinishedRound } from '@/shared/session/roundResults';

type Result = FinishedRound['results'][number];

/** Pip-voice headline for the stars earned. Never mocking (BRAND.md). */
export function headlineFor(stars: 0 | 1 | 2 | 3, endedBy: FinishedRound['endedBy']): string {
  if (endedBy === 'out-of-lives') return stars >= 2 ? 'So close!' : 'Good effort!';
  return ['Keep going!', 'Good start!', 'Nice work!', 'Amazing!'][stars]!;
}

const ordinal = (n: number) => (n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

/** The note on the right of each review row (SCREENS.md → term review list). */
export function noteFor(r: Result): string {
  const lastHeard = r.heard.filter(Boolean).at(-1);
  switch (r.outcome) {
    case 'first-try':
      return 'First try';
    case 'assisted':
      return r.heard.length > 1 ? `${ordinal(r.heard.length)} try` : 'With a hint';
    case 'missed':
      return lastHeard ? `Heard “${lastHeard}”` : 'Missed';
    case 'skipped':
      return lastHeard ? `Heard “${lastHeard}”` : 'Skipped';
  }
}

export function summaryOf(round: FinishedRound) {
  const right = round.results.filter((r) => r.outcome === 'first-try' || r.outcome === 'assisted');
  const tricky = round.results.filter((r) => r.outcome !== 'first-try');
  const stars = starsFor(right.length, round.results.length);
  return {
    stars,
    headline: headlineFor(stars, round.endedBy),
    right: right.length,
    total: round.results.length,
    firstTry: round.results.length - tricky.length,
    tricky,
  };
}

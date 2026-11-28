import { dayNumber } from '@blurt/shared/progress';

export type DailyCandidate = {
  id: string;
  title: string;
  subject: string;
  grade: number;
  termCount: number;
  locked: boolean;
  /** "YYYY-MM-DD" when a class has it due */
  dueOn: string | null;
};

/** How far ahead a class due date pulls a topic into the daily challenge. */
export const DAILY_DUE_WINDOW_DAYS = 7;

/**
 * Today's challenge (SCREENS.md → Home). A class topic due within a week comes first (soonest
 * first); otherwise the student's playable topics take turns, one per local day.
 */
export function pickDaily(
  topics: readonly DailyCandidate[],
  localDate: string,
): DailyCandidate | null {
  const playable = topics.filter((t) => t.termCount > 0 && !t.locked);
  if (!playable.length) return null;
  const today = dayNumber(localDate);
  const dueSoon = playable
    .filter((t) => {
      if (!t.dueOn) return false;
      const days = dayNumber(t.dueOn) - today;
      return days >= 0 && days <= DAILY_DUE_WINDOW_DAYS;
    })
    .sort((a, b) => a.dueOn!.localeCompare(b.dueOn!) || a.title.localeCompare(b.title));
  if (dueSoon[0]) return dueSoon[0];
  const ordered = [...playable].sort((a, b) => a.id.localeCompare(b.id));
  return ordered[((today % ordered.length) + ordered.length) % ordered.length]!;
}

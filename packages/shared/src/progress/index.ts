/**
 * Progress rules shared by the app (previews) and the API (authoritative, Phase 3).
 * Levels: every 500 XP is a level; level 1 starts at 0.
 * Streak: +1 per day played, by the student's local date; a missed day resets it.
 */
export const XP_PER_LEVEL = 500;

/** Per-round budgets (SCREENS.md → Play): lives belong to the whole round. */
export const ROUND_RULES = { lives: 3, hints: 3, skips: 2, termsPerRound: 10 } as const;

export type LevelInfo = {
  level: number;
  /** XP earned inside the current level */
  intoLevel: number;
  /** XP needed to reach the next level from the start of this one */
  perLevel: number;
  /** 0–1 progress through the current level */
  fraction: number;
};

export function levelFor(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  return { level, intoLevel, perLevel: XP_PER_LEVEL, fraction: intoLevel / XP_PER_LEVEL };
}

/** Stars for a round (SCREENS.md → Summary): 3 at 90 %+, 2 at 60 %+, 1 for any right answer. */
export function starsFor(right: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0 || right <= 0) return 0;
  const r = right / total;
  if (r >= 0.9) return 3;
  if (r >= 0.6) return 2;
  return 1;
}

/** XP for a correct answer: 100, minus 25 per hint or miss on that term, never below 25. */
export const XP_RULES = { base: 100, penalty: 25, min: 25 } as const;

export function xpFor(hints: number, misses: number): number {
  return Math.max(XP_RULES.min, XP_RULES.base - XP_RULES.penalty * (hints + misses));
}

/** A local calendar date, "YYYY-MM-DD". */
export type LocalDateString = string;

function dayNumber(date: LocalDateString): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Streak after playing on `today`: same day → unchanged; the next day → +1;
 * a gap (or the first game) → 1. A date before the last one played changes nothing.
 */
export function nextStreak(
  streak: number,
  lastPlayedOn: LocalDateString | null,
  today: LocalDateString,
): number {
  if (!lastPlayedOn) return 1;
  const gap = dayNumber(today) - dayNumber(lastPlayedOn);
  if (gap <= 0) return Math.max(streak, 1);
  if (gap === 1) return streak + 1;
  return 1;
}

/** The phone's local date, for the streak. */
export function localDateOf(now: Date): LocalDateString {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Spaced repetition (Phase 5) ─────────────────────────────────────────────

/**
 * Review boxes (a Leitner schedule). Each term a student has played sits in a box; the box sets
 * when it's due again. Box 0 is due today.
 *   right first time → up a box (due in 1, 3, 7, 14, then 30 days)
 *   right with help  → same box, due tomorrow
 *   missed / skipped → back to box 0, due now
 */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;
export const MAX_BOX = REVIEW_INTERVAL_DAYS.length - 1;
/** A term counts as mastered from this box: right first time on two separate reviews. */
export const MASTERED_BOX = 2;
/** At most this many terms in one practice round. */
export const PRACTICE_ROUND_SIZE = ROUND_RULES.termsPerRound;

export type ReviewOutcome = 'first-try' | 'assisted' | 'missed' | 'skipped';

const DAY_MS = 86_400_000;

export function nextReview(
  box: number | null,
  outcome: ReviewOutcome,
  now: Date,
): { box: number; dueAt: Date } {
  const current = Math.min(Math.max(box ?? 0, 0), MAX_BOX);
  if (outcome === 'first-try') {
    const next = Math.min(current + 1, MAX_BOX);
    return { box: next, dueAt: new Date(now.getTime() + REVIEW_INTERVAL_DAYS[next]! * DAY_MS) };
  }
  if (outcome === 'assisted') return { box: current, dueAt: new Date(now.getTime() + DAY_MS) };
  return { box: 0, dueAt: now };
}

export const isMastered = (box: number) => box >= MASTERED_BOX;

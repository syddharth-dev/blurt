import type { LocalTopic } from '@blurt/shared/content';

/** Bonus for finishing the daily challenge (shown on the card; awarded by the server in Phase 3). */
export const DAILY_BONUS_XP = 150;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day number, so the daily topic changes at the student's midnight. */
export function localDayNumber(now: Date): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / DAY_MS);
}

/** Today's topic: the topics take turns, one per day. */
export function dailyTopic<T extends LocalTopic>(topics: readonly T[], now: Date): T | undefined {
  if (!topics.length) return undefined;
  return topics[localDayNumber(now) % topics.length];
}

/** "6h left", or "<1h left" in the last hour before local midnight. */
export function timeLeftLabel(now: Date): string {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hours = Math.floor((midnight.getTime() - now.getTime()) / (60 * 60 * 1000));
  return hours < 1 ? '<1h left' : `${hours}h left`;
}

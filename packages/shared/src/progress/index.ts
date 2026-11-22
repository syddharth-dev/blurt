/**
 * Progress rules shared by the app (previews) and the API (authoritative, Phase 3).
 * Level rule (default, pending confirmation): every 500 XP is a level; level 1 starts at 0.
 */
export const XP_PER_LEVEL = 500;

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

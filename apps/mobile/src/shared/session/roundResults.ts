import { create } from 'zustand';

/** Hands a finished round from Play to Summary (features can't import each other). */
export type FinishedRound = {
  roundId: string;
  topicId: string;
  /** Set for practice rounds, so "Play again" replays the same terms */
  termIds?: string[];
  topicTitle: string;
  /** A subject name, or "Mixed" for the daily mix */
  subject: string;
  score: number;
  bestStreak: number;
  livesLeft: number;
  endedBy: 'complete' | 'out-of-lives' | 'quit';
  /** Daily challenge bonus the server added (included in xpAfter) */
  dailyBonus?: number;
  results: {
    termId: string;
    display: string;
    outcome: 'first-try' | 'assisted' | 'missed' | 'skipped';
    xp: number;
    hintsUsed: number;
    heard: string[];
  }[];
};

export type SummarisedRound = FinishedRound & { xpBefore: number; xpAfter: number };

type State = {
  last: SummarisedRound | null;
  /** XP earned this session. Saved on the server from Phase 3; until then it resets on restart. */
  totalXp: number;
  /** `xp` comes from the server when the round was saved online. */
  setLast: (round: FinishedRound, xp?: { before: number; after: number }) => void;
};

export const useRoundResults = create<State>((set) => ({
  last: null,
  totalXp: 0,
  setLast: (round, xp) =>
    set((s) => {
      const before = xp?.before ?? s.totalXp;
      const after = xp?.after ?? s.totalXp + round.score;
      return { last: { ...round, xpBefore: before, xpAfter: after }, totalXp: after };
    }),
}));

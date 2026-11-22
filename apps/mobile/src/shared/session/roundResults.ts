import { create } from 'zustand';

/** Hands a finished round from Play to Summary (features can't import each other). */
export type FinishedRound = {
  roundId: string;
  topicId: string;
  topicTitle: string;
  /** A subject name, or "Mixed" for the daily mix */
  subject: string;
  score: number;
  bestStreak: number;
  livesLeft: number;
  endedBy: 'complete' | 'out-of-lives' | 'quit';
  results: {
    termId: string;
    display: string;
    outcome: 'first-try' | 'assisted' | 'missed' | 'skipped';
    xp: number;
    hintsUsed: number;
    heard: string[];
  }[];
};

type State = {
  last: FinishedRound | null;
  setLast: (round: FinishedRound) => void;
};

export const useRoundResults = create<State>((set) => ({
  last: null,
  setLast: (round) => set({ last: round }),
}));

/**
 * Answer matcher. Source of truth: docs/SPEECH_AND_MATCHING.md → "Answer matching".
 *
 * The server's verdict is authoritative (AGENTS.md rule 3); the app may call this
 * only for an optimistic preview. The dashboard uses it for "Test with my voice".
 *
 * Phase 0: types and API surface only. The strategy chain
 * (confusable guard → exact → word family → phonetic → near) is built in
 * Phase 1 (docs/ROADMAP.md), driven by the todo tests in matcher.test.ts.
 */
import type { InputMode, Verdict } from '../schemas/index.js';

export type MatchableTerm = {
  canonical: string;
  /** Plurals and alternate spellings, e.g. "nuclei", "sulphur". */
  accept: string[];
  /** Word-family near misses, e.g. { text: "nuclear", reason: "that's the adjective" }. */
  close: Array<{ text: string; reason: string }>;
  /** Terms that must never match, e.g. { text: "neutron", feedback: "That's the neutron…" }. */
  confusables: Array<{ text: string; feedback: string }>;
};

export type MatchResult = {
  verdict: Verdict;
  /** The normalized alternative that decided the verdict, or null. */
  matched: string | null;
  /** Reason or feedback text to show the student, if any. */
  feedback: string | null;
};

export type MatchOptions = {
  inputMode: InputMode;
};

/** Filler words removed before matching (SPEECH_AND_MATCHING.md). */
export const FILLERS = ['um', 'uh', 'the', 'a', 'an', "it's", 'is it'] as const;

export function matchAnswer(
  _term: MatchableTerm,
  _alternatives: readonly string[],
  _options: MatchOptions,
): MatchResult {
  throw new Error('matchAnswer is not implemented yet (ROADMAP Phase 1).');
}

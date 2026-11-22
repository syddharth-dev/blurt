/**
 * Answer matcher. Source of truth: docs/SPEECH_AND_MATCHING.md → "Answer matching".
 *
 * The server's verdict is authoritative (AGENTS.md rule 3); the app may call this
 * only for an optimistic preview. The dashboard uses it for "Test with my voice".
 *
 * For each alternative, in recognizer order, a chain of strategies runs and the first
 * decisive one wins:
 *   1. confusable guard  equals a confusable           → wrong (its feedback)
 *   2. exact             equals canonical / ACCEPT       → correct
 *   3. word family       equals a CLOSE variant          → close (its reason)
 *   4. phonetic          sounds like the term, similarity ≥ 0.8,
 *                        and nearer the term than to any confusable or close form → correct
 *   5. near              similarity ≥ 0.6 (typed: 0.7), same safety check → close
 * The best verdict across all alternatives is returned (correct > close > wrong).
 *
 * Safety (AGENTS.md rule 4): fuzzy steps only ever reward the term itself. If the input is
 * at least as near to a confusable as to the term, it can never be accepted.
 */
import type { InputMode, Verdict } from '../schemas/index.js';
import { matchKey, normalizeForDisplay } from './normalize.js';
import { editSimilarity, soundsAlike } from './similarity.js';

export { FILLERS, matchKey, normalizeForDisplay, normalizeWords } from './normalize.js';
export { editDistance, editSimilarity, soundsAlike } from './similarity.js';

export type MatchableTerm = {
  canonical: string;
  /** Plurals and alternate spellings, e.g. "nuclei", "sulphur". Explicit, never stemmed. */
  accept: string[];
  /** Word-family near misses, e.g. { text: "nuclear", reason: "that's the adjective" }. */
  close: Array<{ text: string; reason: string }>;
  /** Terms that must never match, e.g. { text: "neutron", feedback: "That's the neutron…" }. */
  confusables: Array<{ text: string; feedback: string }>;
};

export type MatchStrategy = 'confusable' | 'exact' | 'family' | 'phonetic' | 'near' | 'none';

export type MatchResult = {
  verdict: Verdict;
  /** The normalized alternative that decided the verdict, or null when nothing was said. */
  matched: string | null;
  strategy: MatchStrategy;
  /** Ready-to-show copy in Pip's voice, or null (correct answers, or no specific advice). */
  feedback: string | null;
};

export type MatchOptions = {
  inputMode: InputMode;
};

export const THRESHOLDS = {
  phonetic: 0.8,
  near: { voice: 0.6, typed: 0.7 },
} as const;

export const NEAR_FEEDBACK = 'Almost — check the ending.';

const RANK: Record<Verdict, number> = { correct: 2, close: 1, wrong: 0 };

export function matchAnswer(
  term: MatchableTerm,
  alternatives: readonly string[],
  options: MatchOptions,
): MatchResult {
  const prepared = prepare(term);
  let best: MatchResult = { verdict: 'wrong', matched: null, strategy: 'none', feedback: null };

  for (const alt of alternatives) {
    const result = matchOne(prepared, alt, options);
    if (!result) continue;
    // Strictly better wins, so earlier alternatives keep ties (recognizer order).
    // A wrong with confusable feedback beats a plain wrong: it tells the student something useful.
    // The first non-empty alternative is always kept, so reports show what was heard.
    const better =
      best.matched === null ||
      RANK[result.verdict] > RANK[best.verdict] ||
      (result.verdict === 'wrong' && best.strategy === 'none' && result.strategy === 'confusable');
    if (better) best = result;
    if (best.verdict === 'correct') break;
  }
  return best;
}

type Prepared = {
  targets: string[]; // canonical + ACCEPT keys
  close: Array<{ key: string; reason: string }>;
  confusables: Array<{ key: string; feedback: string }>;
};

function prepare(term: MatchableTerm): Prepared {
  return {
    targets: [term.canonical, ...term.accept].map(matchKey).filter(Boolean),
    close: term.close
      .map((c) => ({ key: matchKey(c.text), reason: c.reason }))
      .filter((c) => c.key),
    confusables: term.confusables
      .map((c) => ({ key: matchKey(c.text), feedback: c.feedback }))
      .filter((c) => c.key),
  };
}

function matchOne(p: Prepared, alt: string, { inputMode }: MatchOptions): MatchResult | null {
  const key = matchKey(alt);
  if (!key) return null;
  const matched = normalizeForDisplay(alt);
  const result = (verdict: Verdict, strategy: MatchStrategy, feedback: string | null = null) => ({
    verdict,
    matched,
    strategy,
    feedback,
  });

  // 1. Confusable guard: always first.
  const confusable = p.confusables.find((c) => c.key === key);
  if (confusable) return result('wrong', 'confusable', confusable.feedback);

  // 2. Exact (canonical or ACCEPT variant).
  if (p.targets.includes(key)) return result('correct', 'exact');

  // 3. Word family (CLOSE variant).
  const family = p.close.find((c) => c.key === key);
  if (family) return result('close', 'family', closeCopy(family.reason));

  // 4–5. Fuzzy steps. Find the nearest form of each kind.
  const target = nearest(
    key,
    p.targets.map((t) => ({ key: t })),
  );
  if (!target) return result('wrong', 'none');
  const confusableSim = nearest(key, p.confusables)?.sim ?? 0;
  const familyHit = nearest(key, p.close);

  // Safety: if a confusable is as near as the term (ties included), never reward it.
  if (confusableSim >= target.sim) return result('wrong', 'none');
  // Nearer a word-family form than the term: it's that form, slightly garbled.
  if (familyHit && familyHit.sim > target.sim && familyHit.sim >= THRESHOLDS.near[inputMode]) {
    return result('close', 'family', closeCopy(familyHit.item.reason));
  }

  // 4. Phonetic: an accent or spelling slip of the term itself.
  if (target.sim >= THRESHOLDS.phonetic && soundsAlike(key, target.item.key)) {
    return result('correct', 'phonetic');
  }

  // 5. Near.
  if (target.sim >= THRESHOLDS.near[inputMode]) return result('close', 'near', NEAR_FEEDBACK);

  return result('wrong', 'none');
}

function nearest<T extends { key: string }>(
  key: string,
  items: readonly T[],
): { item: T; sim: number } | null {
  let best: { item: T; sim: number } | null = null;
  for (const item of items) {
    const sim = editSimilarity(key, item.key);
    if (!best || sim > best.sim) best = { item, sim };
  }
  return best;
}

/** "that's the adjective" → "Close — that's the adjective." (BRAND.md voice table). */
function closeCopy(reason: string): string {
  const trimmed = reason.trim().replace(/[.!]+$/, '');
  return `Close — ${trimmed}.`;
}

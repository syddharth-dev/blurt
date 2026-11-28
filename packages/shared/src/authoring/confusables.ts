/**
 * Confusable suggestions for the term editor (TEACHER_DASHBOARD.md → "Never accept").
 * Given the answer being written and the other terms nearby (same topic, plus the shared
 * library in the same subject), suggest the ones a student could mix it up with.
 * The teacher ticks the ones that apply; nothing is added without them.
 */
import { matchKey } from '../matcher/normalize.js';
import { editSimilarity, soundsAlike } from '../matcher/similarity.js';

export type ConfusableCandidate = {
  /** The other term's answer, e.g. "neutron". */
  canonical: string;
  /** e.g. "Neutron" */
  display: string;
  /** That term's own confusables: if it lists our answer, the pair is suggested. */
  confusables?: ReadonlyArray<{ text: string }>;
  /** Terms in the same topic need less to be suggested ("proton" / "neutron" share "-on"). */
  sameTopic?: boolean;
};

export type ConfusableSuggestion = {
  text: string;
  display: string;
  /** A starting point for the feedback; the teacher can rewrite it. */
  feedback: string;
  /** Why it was suggested, shown next to the tick box. */
  why: 'listed' | 'sounds-alike' | 'similar-spelling' | 'same-ending';
  score: number;
};

const WHY_SCORE = { listed: 4, 'sounds-alike': 3, 'similar-spelling': 2, 'same-ending': 1 };

function commonSuffix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

/** Default feedback in Pip's voice (BRAND.md): names the other term, never "Wrong". */
export function defaultConfusableFeedback(display: string): string {
  return `That's ${display}, a different term.`;
}

export function suggestConfusables(
  answer: string,
  candidates: readonly ConfusableCandidate[],
  limit = 6,
): ConfusableSuggestion[] {
  const key = matchKey(answer);
  if (key.length < 3) return [];
  const seen = new Set<string>([key]);
  const out: ConfusableSuggestion[] = [];

  for (const c of candidates) {
    const other = matchKey(c.canonical);
    if (!other || seen.has(other)) continue;
    const similarity = editSimilarity(key, other);
    const why: ConfusableSuggestion['why'] | null = c.confusables?.some(
      (x) => matchKey(x.text) === key,
    )
      ? 'listed'
      : soundsAlike(key, other)
        ? 'sounds-alike'
        : similarity >= 0.5
          ? 'similar-spelling'
          : key.length >= 5 &&
              other.length >= 5 &&
              commonSuffix(key, other) >= (c.sameTopic ? 2 : 3)
            ? 'same-ending'
            : null;
    if (!why) continue;
    seen.add(other);
    out.push({
      text: c.canonical.trim().toLowerCase(),
      display: c.display,
      feedback: defaultConfusableFeedback(c.display),
      why,
      score: WHY_SCORE[why] + similarity,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

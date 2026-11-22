import { doubleMetaphone } from 'double-metaphone';

/** Levenshtein edit distance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[b.length]!;
}

/** Edit similarity in [0, 1]: 1 − distance / longer length. */
export function editSimilarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest;
}

/** True when the two keys share a Double Metaphone code (primary or secondary). */
export function soundsAlike(a: string, b: string): boolean {
  if (!a || !b) return false;
  const [a1, a2] = doubleMetaphone(a);
  const [b1, b2] = doubleMetaphone(b);
  return a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2;
}

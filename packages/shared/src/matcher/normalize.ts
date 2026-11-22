/**
 * Text normalization shared by every matcher step (docs/SPEECH_AND_MATCHING.md).
 * Applied to BOTH the student's input and the term's own forms, so filler words
 * inside multi-word terms are treated the same on each side.
 */

/** Single-word fillers. "it's" becomes "its" once apostrophes are stripped. */
const FILLER_WORDS = new Set([
  'um',
  'umm',
  'uh',
  'uhh',
  'er',
  'erm',
  'hmm',
  'the',
  'a',
  'an',
  'its',
]);
/** Multi-word fillers, matched as whole-word sequences. */
const FILLER_PHRASES: ReadonlyArray<readonly string[]> = [['is', 'it']];

/** The documented filler list, for reference and tests. */
export const FILLERS = ['um', 'uh', 'the', 'a', 'an', "it's", 'is it'] as const;

/** Lowercase, strip accents and punctuation, drop fillers. Returns the words. */
export function normalizeWords(input: string): string[] {
  const words = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining accents
    .toLowerCase()
    .replace(/['’`]/g, '') // "newton's" → "newtons", "it's" → "its"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const phrase = FILLER_PHRASES.find((p) => p.every((w, j) => words[i + j] === w));
    if (phrase) {
      i += phrase.length - 1;
      continue;
    }
    const word = words[i];
    if (word && !FILLER_WORDS.has(word)) out.push(word);
  }
  return out;
}

/** Comparison key: normalized words joined with no spaces ("cell membrane" = "cellmembrane"). */
export function matchKey(input: string): string {
  return normalizeWords(input).join('');
}

/** Normalized text for display ("um the Nucleus!" → "nucleus"). */
export function normalizeForDisplay(input: string): string {
  return normalizeWords(input).join(' ');
}

/**
 * Suggested syllable breaks for the term editor ("nucleus" → "nu·cle·us").
 * A small rule-based guess (TEACHER_DASHBOARD.md → Term editor): the teacher can always edit it.
 */

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
/** Consonant pairs that stay together at the start of a syllable. */
const ONSETS = new Set([
  'bl',
  'br',
  'ch',
  'cl',
  'cr',
  'dr',
  'fl',
  'fr',
  'gl',
  'gr',
  'kn',
  'ph',
  'pl',
  'pr',
  'sc',
  'sh',
  'sk',
  'sl',
  'sm',
  'sn',
  'sp',
  'st',
  'sw',
  'th',
  'tr',
  'tw',
  'wh',
  'wr',
  'chr',
  'sch',
  'scr',
  'shr',
  'spl',
  'spr',
  'str',
  'thr',
]);
/** Vowel pairs said as two syllables ("an·i·on"). */
const SPLIT_VOWELS = new Set(['io', 'eo', 'ua', 'uo']);

const isVowel = (word: string, i: number) => {
  const c = word[i]!;
  if (c === 'y') return i > 0 && !VOWELS.has(word[i - 1]!);
  return VOWELS.has(c);
};

function syllabifyWord(word: string): string {
  const w = word.toLowerCase();
  if (!/^[a-z]+$/.test(w) || w.length <= 3) return word;

  // Vowel groups as [start, end) index pairs.
  const groups: Array<[number, number]> = [];
  for (let i = 0; i < w.length; i++) {
    if (!isVowel(w, i)) continue;
    const prev = groups[groups.length - 1];
    // "-eus" / "-ius" at the end is two syllables: "nu·cle·us", "ra·di·us".
    const finalUs = w[i] === 'u' && i === w.length - 2 && w.endsWith('s');
    // "-tion", "-sion", "-cion" stay one syllable: "fric·tion".
    const suffixIon = 'tsc'.includes(w[i - 2] ?? '') && w.slice(i - 1, i + 2) === 'ion';
    const split = SPLIT_VOWELS.has(w.slice(i - 1, i + 1)) && !suffixIon;
    if (prev && prev[1] === i && !finalUs && !split) prev[1] = i + 1;
    else groups.push([i, i + 1]);
  }
  // A silent final "e" ("isotope", "gene") is not its own syllable; "-le" is.
  const last = groups[groups.length - 1];
  if (
    groups.length > 1 &&
    last &&
    last[0] === w.length - 1 &&
    w.endsWith('e') &&
    !w.endsWith('le')
  ) {
    groups.pop();
  }
  if (groups.length <= 1) return word;

  const cuts: number[] = [];
  for (let g = 0; g < groups.length - 1; g++) {
    const from = groups[g]![1];
    const to = groups[g + 1]![0];
    const cluster = w.slice(from, to);
    if (cluster.length === 0)
      cuts.push(from); // split vowels: "i·on"
    else if (cluster.length === 1)
      cuts.push(from); // V·CV: "pro·ton"
    else {
      // Keep the longest onset with the next syllable: "neu·tron", "chlo·ro·plast".
      let keep = 1;
      for (let n = Math.min(3, cluster.length); n >= 2; n--) {
        if (ONSETS.has(cluster.slice(-n))) {
          keep = n;
          break;
        }
      }
      cuts.push(to - keep);
    }
  }
  // Keep the caller's capitalisation.
  const parts: string[] = [];
  let start = 0;
  for (const cut of cuts) {
    parts.push(word.slice(start, cut));
    start = cut;
  }
  parts.push(word.slice(start));
  return parts.join('·');
}

/** "kinetic energy" → "ki·ne·tic en·er·gy" (a suggestion; teachers can edit it). */
export function suggestSyllables(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.split('-').map(syllabifyWord).join('-'))
    .join(' ');
}

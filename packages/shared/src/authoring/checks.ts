/**
 * Publish checks (TEACHER_DASHBOARD.md → "Validation before publishing"). The dashboard shows
 * them live; the API runs the same function and refuses to publish a term that fails.
 */
import { matchKey } from '../matcher/normalize.js';

export type CheckableTerm = {
  canonical: string;
  clue: string;
  fact: string;
  accept: readonly string[];
  confusables: ReadonlyArray<{ text: string }>;
  /** Whether a picture is attached and processed. */
  hasPicture: boolean;
  hasHighlight: boolean;
};

export type CheckOptions = {
  /** Starter library terms may have no picture (DATA_AND_API.md → Term.pictureId). */
  requirePicture: boolean;
};

export type TermChecks = {
  /** Block publishing. */
  problems: string[];
  /** Worth a look, but don't block. */
  warnings: string[];
};

export function termChecks(term: CheckableTerm, { requirePicture }: CheckOptions): TermChecks {
  const problems: string[] = [];
  const warnings: string[] = [];
  const answer = matchKey(term.canonical);

  if (requirePicture && !term.hasPicture) problems.push('Add a picture.');
  if (requirePicture && term.hasPicture && !term.hasHighlight)
    problems.push('Mark the part to name on the picture.');
  if (!answer) problems.push('Type the answer.');
  if (!term.clue.trim()) problems.push('Write a clue.');
  if (!term.fact.trim()) problems.push('Write a quick fact.');

  const accepted = new Set([answer, ...term.accept.map(matchKey)].filter(Boolean));
  for (const c of term.confusables) {
    const k = matchKey(c.text);
    if (k && accepted.has(k)) {
      problems.push(`"${c.text.trim()}" is both accepted and in "Never accept". Pick one.`);
    }
  }

  if (answer && term.clue && matchKey(term.clue).includes(answer)) {
    warnings.push('The clue contains the answer.');
  }
  return { problems, warnings };
}

/** "nucleus" → "Nucleus" (the display name when the teacher leaves it blank). */
export function defaultDisplay(answer: string): string {
  const t = answer.trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : '';
}

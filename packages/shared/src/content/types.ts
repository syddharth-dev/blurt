import type { MatchableTerm } from '../matcher/index.js';

export type SubjectName = 'Chemistry' | 'Biology' | 'Physics' | 'Earth & Space';

/** A term as bundled locally (ROADMAP Phases 1–2). Mirrors the Term model in DATA_AND_API.md. */
export type ContentTerm = MatchableTerm & {
  id: string;
  subject: SubjectName;
  topic: string;
  /** Shown on tiles and in feedback, e.g. "Nucleus". */
  display: string;
  /** e.g. "nu·cle·us" */
  syllables: string;
  /** First hint: one sentence, never contains the answer. */
  clue: string;
  /** Shown after a correct answer: one sentence. */
  fact: string;
  difficulty: 1 | 2 | 3;
};

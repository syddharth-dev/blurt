import type { MatchableTerm } from '../matcher/index.js';

export type SubjectName = 'Chemistry' | 'Biology' | 'Physics' | 'Earth & Space';

/** A bundled diagram (Phase 2) or, later, a teacher's processed upload. */
export type LocalPicture = {
  /** Key into the app's diagram registry, e.g. "atom". */
  diagram: string;
  /** Highlight box as fractions (0–1) of the picture (DATA_AND_API.md → Term.highlight). */
  highlight: {
    shape: 'ellipse' | 'rect';
    x: number;
    y: number;
    w: number;
    h: number;
    /** Which side the "?" badge goes; by default the roomier side. */
    badge?: 'left' | 'right';
  };
  /** Describes the picture without giving the answer. */
  altText: string;
};

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
  /** Optional until every term has a picture; without one, the card shows the clue. */
  picture?: LocalPicture;
};

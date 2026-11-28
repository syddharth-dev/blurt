/**
 * Request/response shapes shared by the app, dashboard and API.
 * Source of truth: docs/DATA_AND_API.md. The API validates bodies with these schemas
 * (Nest's StandardSchemaValidationPipe); the app uses the inferred types.
 */
import { z } from 'zod';

export const Verdict = z.enum(['correct', 'close', 'wrong']);
export type Verdict = z.infer<typeof Verdict>;

export const InputMode = z.enum(['voice', 'typed']);
export type InputMode = z.infer<typeof InputMode>;

export const Role = z.enum(['STUDENT', 'TEACHER', 'ADMIN']);
export type Role = z.infer<typeof Role>;

/** "YYYY-MM-DD" on the student's phone: streaks follow the local calendar. */
export const LocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Highlight box as fractions (0–1) of the picture. */
export const Highlight = z.object({
  shape: z.enum(['ellipse', 'rect']),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
  badge: z.enum(['left', 'right']).optional(),
});
export type Highlight = z.infer<typeof Highlight>;

// ── /me ──────────────────────────────────────────────────────────────────────

export const Me = z.object({
  id: z.string(),
  name: z.string(),
  role: Role,
  grade: z.number().int().nullable(),
  xp: z.number().int(),
  level: z.number().int(),
  streak: z.number().int(),
  lastPlayedOn: LocalDate.nullable(),
});
export type Me = z.infer<typeof Me>;

export const UpdateMe = z
  .object({
    name: z.string().trim().min(1).max(40),
    grade: z.number().int().min(6).max(12),
  })
  .partial()
  .strict();
export type UpdateMe = z.infer<typeof UpdateMe>;

// ── /subjects ────────────────────────────────────────────────────────────────

export const TopicSummary = z.object({
  id: z.string(),
  title: z.string(),
  grade: z.number().int(),
  termCount: z.number().int(),
  unlockLevel: z.number().int(),
  locked: z.boolean(),
  /** Terms this student has mastered in the topic */
  mastered: z.number().int(),
});
export type TopicSummary = z.infer<typeof TopicSummary>;

export const SubjectWithTopics = z.object({
  id: z.string(),
  name: z.string(),
  /** Brand token name, e.g. "coral" */
  color: z.string(),
  topics: z.array(TopicSummary),
});
export const SubjectsResponse = z.object({ subjects: z.array(SubjectWithTopics) });
export type SubjectsResponse = z.infer<typeof SubjectsResponse>;

// ── /rounds ──────────────────────────────────────────────────────────────────

/** Start a round from a topic, or practise specific terms. */
export const StartRound = z.union([
  z.object({ topicId: z.string().min(1) }).strict(),
  z.object({ termIds: z.array(z.string().min(1)).min(1).max(20) }).strict(),
]);
export type StartRound = z.infer<typeof StartRound>;

export const RoundPicture = z.object({
  /** A bundled diagram id (e.g. "atom"), or null for an uploaded picture with a url */
  diagram: z.string().nullable(),
  url: z.string().nullable(),
  highlight: Highlight,
  altText: z.string(),
});

/**
 * A term as sent with a round. Answers are included so the app can check offline and
 * preview instantly; the server re-checks every attempt and alone decides (AGENTS.md rule 3).
 */
export const RoundTerm = z.object({
  id: z.string(),
  version: z.number().int(),
  subject: z.string(),
  topic: z.string(),
  canonical: z.string(),
  display: z.string(),
  syllables: z.string(),
  clue: z.string(),
  fact: z.string(),
  difficulty: z.number().int(),
  audioUrl: z.string().nullable(),
  accept: z.array(z.string()),
  close: z.array(z.object({ text: z.string(), reason: z.string() })),
  confusables: z.array(z.object({ text: z.string(), feedback: z.string() })),
  picture: RoundPicture.nullable(),
});
export type RoundTerm = z.infer<typeof RoundTerm>;

export const RoundStarted = z.object({
  roundId: z.string(),
  topic: z.object({ id: z.string().nullable(), title: z.string(), subject: z.string() }),
  terms: z.array(RoundTerm),
  lives: z.number().int(),
  hints: z.number().int(),
  skips: z.number().int(),
});
export type RoundStarted = z.infer<typeof RoundStarted>;

/** POST /v1/rounds/:id/attempts */
export const AttemptRequest = z.object({
  termId: z.string().min(1),
  alternatives: z.array(z.string().max(200)).min(1).max(10),
  inputMode: InputMode,
  hintsUsed: z.number().int().min(0),
  ms: z.number().int().min(0),
  idempotencyKey: z.string().min(8).max(100),
});
export type AttemptRequest = z.infer<typeof AttemptRequest>;

export const AttemptResponse = z.object({
  verdict: Verdict,
  matched: z.string().nullable(),
  feedback: z.string().nullable(),
  pronunciation: z.object({
    syllables: z.string(),
    audioUrl: z.string().nullable(),
  }),
  livesLeft: z.number().int().min(0),
  xpGained: z.number().int().min(0),
});
export type AttemptResponse = z.infer<typeof AttemptResponse>;

/** POST /v1/rounds/:id/skip */
export const SkipRequest = z.object({
  termId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(100),
});
export type SkipRequest = z.infer<typeof SkipRequest>;

export const SkipResponse = z.object({ skipsLeft: z.number().int().min(0) });
export type SkipResponse = z.infer<typeof SkipResponse>;

/** POST /v1/rounds/:id/finish */
export const FinishRound = z.object({ localDate: LocalDate }).strict();
export type FinishRound = z.infer<typeof FinishRound>;

export const TermOutcome = z.enum(['first-try', 'assisted', 'missed', 'skipped']);

export const RoundSummaryResponse = z.object({
  roundId: z.string(),
  score: z.number().int(),
  xpBefore: z.number().int(),
  xpAfter: z.number().int(),
  level: z.number().int(),
  levelledUp: z.boolean(),
  streak: z.number().int(),
  bestStreak: z.number().int(),
  livesLeft: z.number().int(),
  endedBy: z.enum(['complete', 'out-of-lives', 'quit']),
  results: z.array(
    z.object({
      termId: z.string(),
      display: z.string(),
      outcome: TermOutcome,
      xp: z.number().int(),
      hintsUsed: z.number().int(),
      heard: z.array(z.string()),
    }),
  ),
});
export type RoundSummaryResponse = z.infer<typeof RoundSummaryResponse>;

// ── /admin ───────────────────────────────────────────────────────────────────

export const InviteTeacher = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    name: z.string().trim().min(1).max(60).optional(),
  })
  .strict();
export type InviteTeacher = z.infer<typeof InviteTeacher>;

export const StaffMember = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  role: Role,
});
export type StaffMember = z.infer<typeof StaffMember>;

export const InviteResult = z.object({
  /** invited: a new account and an invite email · promoted: an existing account became a teacher */
  status: z.enum(['invited', 'promoted', 'already-staff']),
  teacher: StaffMember,
});
export type InviteResult = z.infer<typeof InviteResult>;

export const StaffList = z.object({ staff: z.array(StaffMember) });
export type StaffList = z.infer<typeof StaffList>;

// ── Errors and health ────────────────────────────────────────────────────────

/** Every error response uses this one shape. */
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** Error codes the app reacts to. */
export const ERROR_CODES = {
  roundFinished: 'ROUND_FINISHED',
  outOfLives: 'OUT_OF_LIVES',
  noSkipsLeft: 'NO_SKIPS_LEFT',
  termNotInRound: 'TERM_NOT_IN_ROUND',
  termDone: 'TERM_DONE',
  topicLocked: 'TOPIC_LOCKED',
} as const;

export const HealthResponse = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof HealthResponse>;

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
  /** Assigned to one of the student's classes (never locked) */
  assigned: z.boolean(),
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
  /** Pixel size of an uploaded picture, so the app can fit it and place the highlight */
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
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

// ── /teacher ─────────────────────────────────────────────────────────────────

export const Status = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type Status = z.infer<typeof Status>;

const line = (max: number) => z.string().trim().max(max);

export const SubjectOption = z.object({ id: z.string(), name: z.string(), color: z.string() });
export type SubjectOption = z.infer<typeof SubjectOption>;
export const SubjectList = z.object({ subjects: z.array(SubjectOption) });
export type SubjectList = z.infer<typeof SubjectList>;

export const CreateTopic = z
  .object({
    title: line(80).min(1),
    subjectId: z.string().min(1),
    grade: z.number().int().min(6).max(12),
    curriculumCode: line(40).optional(),
  })
  .strict();
export type CreateTopic = z.infer<typeof CreateTopic>;

export const UpdateTopic = CreateTopic.partial().strict();
export type UpdateTopic = z.infer<typeof UpdateTopic>;

/** What the teacher types for a term. Drafts may leave clue and fact blank. */
export const TermDraft = z
  .object({
    canonical: line(60).min(1),
    /** Blank → the answer with a capital letter */
    display: line(60).optional(),
    /** Blank → suggested from the answer */
    syllables: line(80).optional(),
    clue: line(200).default(''),
    fact: line(280).default(''),
    accept: z.array(line(60).min(1)).max(20).default([]),
    close: z
      .array(z.object({ text: line(60).min(1), reason: line(120).min(1) }).strict())
      .max(20)
      .default([]),
    confusables: z
      .array(z.object({ text: line(60).min(1), feedback: line(160).min(1) }).strict())
      .max(20)
      .default([]),
    difficulty: z.number().int().min(1).max(3).default(1),
    pictureId: z.string().min(1).nullable().optional(),
    highlight: Highlight.nullable().optional(),
  })
  .strict();
export type TermDraft = z.input<typeof TermDraft>;

/** POST /teacher/topics/:id/terms: a new term, saved as a draft (or published if `publish`). */
export const CreateTerm = TermDraft.extend({ publish: z.boolean().optional() }).strict();
export type CreateTerm = z.input<typeof CreateTerm>;

/** PATCH /teacher/terms/:id. `publish: true` checks the term and publishes it. */
export const UpdateTerm = z
  .object({
    ...TermDraft.shape,
    canonical: line(60).min(1).optional(),
    clue: line(200).optional(),
    fact: line(280).optional(),
    accept: TermDraft.shape.accept.unwrap().optional(),
    close: TermDraft.shape.close.unwrap().optional(),
    confusables: TermDraft.shape.confusables.unwrap().optional(),
    difficulty: TermDraft.shape.difficulty.unwrap().optional(),
    publish: z.boolean().optional(),
  })
  .strict();
export type UpdateTerm = z.input<typeof UpdateTerm>;

export const ReorderTerms = z.object({ termIds: z.array(z.string().min(1)).max(200) }).strict();
export type ReorderTerms = z.infer<typeof ReorderTerms>;

export const PictureState = z.enum(['UPLOADING', 'PROCESSING', 'READY', 'FAILED']);
export type PictureState = z.infer<typeof PictureState>;

export const TeacherPicture = z.object({
  id: z.string(),
  diagram: z.string().nullable(),
  url: z.string().nullable(),
  thumbUrl: z.string().nullable(),
  /** Pixel size once processed (bundled diagrams are 200 × 200) */
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  state: PictureState,
  altText: z.string().nullable(),
});
export type TeacherPicture = z.infer<typeof TeacherPicture>;

/** Picture rules shared by the dashboard (early feedback) and the API (TEACHER_DASHBOARD.md). */
export const PICTURE_RULES = {
  maxBytes: 5 * 1024 * 1024,
  /** What the browser may claim. The API checks the real type from the file's bytes. */
  contentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
} as const;

/** POST /teacher/pictures/upload-url. The name and type are hints only, never trusted. */
export const PictureUploadRequest = z
  .object({
    fileName: z.string().max(200),
    contentType: z.enum(PICTURE_RULES.contentTypes),
    size: z.number().int().min(1).max(PICTURE_RULES.maxBytes),
  })
  .strict();
export type PictureUploadRequest = z.infer<typeof PictureUploadRequest>;

/** Upload straight to Supabase Storage with uploadToSignedUrl(path, token, file). */
export const PictureUploadTicket = z.object({
  pictureId: z.string(),
  bucket: z.string(),
  path: z.string(),
  token: z.string(),
});
export type PictureUploadTicket = z.infer<typeof PictureUploadTicket>;

/** PATCH /teacher/pictures/:id */
export const UpdatePicture = z.object({ altText: z.string().trim().max(200) }).strict();
export type UpdatePicture = z.infer<typeof UpdatePicture>;

export const TeacherTerm = z.object({
  id: z.string(),
  topicId: z.string(),
  position: z.number().int(),
  status: Status,
  version: z.number().int(),
  canonical: z.string(),
  display: z.string(),
  syllables: z.string(),
  clue: z.string(),
  fact: z.string(),
  accept: z.array(z.string()),
  close: z.array(z.object({ text: z.string(), reason: z.string() })),
  confusables: z.array(z.object({ text: z.string(), feedback: z.string() })),
  difficulty: z.number().int(),
  picture: TeacherPicture.nullable(),
  highlight: Highlight.nullable(),
  /** From termChecks in @blurt/shared/authoring: problems block publishing. */
  problems: z.array(z.string()),
  warnings: z.array(z.string()),
  updatedAt: z.string(),
});
export type TeacherTerm = z.infer<typeof TeacherTerm>;

export const TeacherTopicSummary = z.object({
  id: z.string(),
  title: z.string(),
  subject: SubjectOption,
  grade: z.number().int(),
  curriculumCode: z.string().nullable(),
  status: Status,
  termCount: z.number().int(),
  /** Terms with problems that block publishing */
  termsNotReady: z.number().int(),
  /** Class names it's assigned to (Phase 4 step 5) */
  classes: z.array(z.string()),
  updatedAt: z.string(),
});
export type TeacherTopicSummary = z.infer<typeof TeacherTopicSummary>;

export const TeacherTopicList = z.object({ topics: z.array(TeacherTopicSummary) });
export type TeacherTopicList = z.infer<typeof TeacherTopicList>;

export const TeacherTopicDetail = TeacherTopicSummary.extend({
  /** Starter library topics may publish terms without pictures */
  library: z.boolean(),
  terms: z.array(TeacherTerm),
});
export type TeacherTopicDetail = z.infer<typeof TeacherTopicDetail>;

export const ConfusableSuggestionsRequest = z
  .object({
    answer: line(60).min(1),
    topicId: z.string().min(1),
    /** The term being edited, left out of its own suggestions */
    termId: z.string().min(1).optional(),
  })
  .strict();
export type ConfusableSuggestionsRequest = z.infer<typeof ConfusableSuggestionsRequest>;

export const ConfusableSuggestions = z.object({
  suggestions: z.array(
    z.object({
      text: z.string(),
      display: z.string(),
      feedback: z.string(),
      why: z.enum(['listed', 'sounds-alike', 'similar-spelling', 'same-ending']),
    }),
  ),
});
export type ConfusableSuggestions = z.infer<typeof ConfusableSuggestions>;

/**
 * POST /teacher/match-test ("Test with my voice"): the term as it is in the editor, saved or
 * not, plus what the browser heard. Runs the same matcher the server uses for students.
 */
export const MatchTestRequest = z
  .object({
    term: z
      .object({
        canonical: z.string().trim().min(1).max(60),
        accept: z.array(z.string().max(60)).max(20).default([]),
        close: z
          .array(z.object({ text: z.string().max(60), reason: z.string().max(120) }))
          .max(20)
          .default([]),
        confusables: z
          .array(z.object({ text: z.string().max(60), feedback: z.string().max(160) }))
          .max(20)
          .default([]),
      })
      .strict(),
    alternatives: z.array(z.string().max(200)).min(1).max(10),
    inputMode: InputMode,
  })
  .strict();
export type MatchTestRequest = z.input<typeof MatchTestRequest>;

export const MatchTestResult = z.object({
  verdict: Verdict,
  matched: z.string().nullable(),
  feedback: z.string().nullable(),
  /** Which matcher step decided: shown to teachers so they can see why */
  strategy: z.enum(['confusable', 'exact', 'family', 'phonetic', 'near', 'none']),
});
export type MatchTestResult = z.infer<typeof MatchTestResult>;

// ── Classes ──────────────────────────────────────────────────────────────────

/** 6 characters, no look-alikes (no 0/O, 1/I/L). Typed in any case. */
export const CLASS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ClassCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, 'A class code has 6 letters and numbers.');

/** POST /classes/join */
export const JoinClass = z.object({ code: ClassCode }).strict();
export type JoinClass = z.infer<typeof JoinClass>;

export const AssignedTopic = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  /** Brand token name, e.g. "coral" */
  color: z.string(),
  termCount: z.number().int(),
  mastered: z.number().int(),
  /** "YYYY-MM-DD", or null for no due date */
  dueOn: LocalDate.nullable(),
});
export type AssignedTopic = z.infer<typeof AssignedTopic>;

export const StudentClass = z.object({
  id: z.string(),
  name: z.string(),
  teacherName: z.string(),
  /** Published topics assigned to the class, due soonest first */
  topics: z.array(AssignedTopic),
});
export type StudentClass = z.infer<typeof StudentClass>;

/** GET /classes */
export const StudentClasses = z.object({ classes: z.array(StudentClass) });
export type StudentClasses = z.infer<typeof StudentClasses>;

export const JoinClassResult = z.object({ class: StudentClass, alreadyMember: z.boolean() });
export type JoinClassResult = z.infer<typeof JoinClassResult>;

/** POST /teacher/classes */
export const CreateClass = z.object({ name: z.string().trim().min(1).max(60) }).strict();
export type CreateClass = z.infer<typeof CreateClass>;

/** PATCH /teacher/classes/:id. `newCode: true` replaces the join code (the old one stops working). */
export const UpdateClass = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    newCode: z.literal(true).optional(),
  })
  .strict();
export type UpdateClass = z.infer<typeof UpdateClass>;

/** PUT /teacher/classes/:id/topics: the full list of assigned topics (replaces what was there). */
export const AssignTopics = z
  .object({
    topics: z
      .array(z.object({ topicId: z.string().min(1), dueOn: LocalDate.nullable() }).strict())
      .max(100),
  })
  .strict();
export type AssignTopics = z.infer<typeof AssignTopics>;

export const TeacherClassSummary = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  studentCount: z.number().int(),
  topicCount: z.number().int(),
});
export type TeacherClassSummary = z.infer<typeof TeacherClassSummary>;

export const TeacherClassList = z.object({ classes: z.array(TeacherClassSummary) });
export type TeacherClassList = z.infer<typeof TeacherClassList>;

export const TeacherClassDetail = TeacherClassSummary.extend({
  students: z.array(z.object({ id: z.string(), name: z.string(), joinedAt: z.string() })),
  topics: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      subject: z.string(),
      status: Status,
      dueOn: LocalDate.nullable(),
    }),
  ),
});
export type TeacherClassDetail = z.infer<typeof TeacherClassDetail>;

// ── Reports (teachers) ───────────────────────────────────────────────────────

/** How far back a report looks. */
export const ReportRange = z.enum(['7d', '30d', 'all']);
export type ReportRange = z.infer<typeof ReportRange>;

/**
 * Definitions (TEACHER_DASHBOARD.md → Reports):
 * - answers: spoken or typed attempts (skips aren't answers);
 * - accuracy: right answers ÷ answers, null when there are none;
 * - misses: close + wrong answers + skips.
 */
const Accuracy = z.number().min(0).max(1).nullable();

export const MissedTerm = z.object({
  termId: z.string(),
  display: z.string(),
  topic: z.string(),
  answers: z.number().int(),
  correct: z.number().int(),
  misses: z.number().int(),
  accuracy: Accuracy,
  /** What students said instead, most common first (text only) */
  heard: z.array(z.object({ text: z.string(), count: z.number().int() })),
});
export type MissedTerm = z.infer<typeof MissedTerm>;

export const ClassReport = z.object({
  range: ReportRange,
  /** Start of the range, or null for all time */
  since: z.string().nullable(),
  summary: z.object({
    students: z.number().int(),
    activeStudents: z.number().int(),
    rounds: z.number().int(),
    answers: z.number().int(),
    accuracy: Accuracy,
  }),
  /** Most misses first, at most 10 */
  missedTerms: z.array(MissedTerm),
  students: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rounds: z.number().int(),
      answers: z.number().int(),
      accuracy: Accuracy,
      lastPlayedAt: z.string().nullable(),
      /** Terms whose latest try wasn't right */
      toPractise: z.number().int(),
    }),
  ),
});
export type ClassReport = z.infer<typeof ClassReport>;

export const StudentReport = z.object({
  range: ReportRange,
  since: z.string().nullable(),
  student: z.object({ id: z.string(), name: z.string() }),
  className: z.string(),
  summary: z.object({
    rounds: z.number().int(),
    answers: z.number().int(),
    accuracy: Accuracy,
    lastPlayedAt: z.string().nullable(),
  }),
  /** Every term they've tried in the class's topics, weakest first */
  terms: z.array(MissedTerm),
});
export type StudentReport = z.infer<typeof StudentReport>;

export const TeacherOverview = z.object({
  classes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      studentCount: z.number().int(),
      activeThisWeek: z.number().int(),
      roundsThisWeek: z.number().int(),
      accuracyThisWeek: Accuracy,
    }),
  ),
  /** Latest finished rounds in your classes' topics */
  recent: z.array(
    z.object({
      studentName: z.string(),
      className: z.string(),
      topic: z.string(),
      correct: z.number().int(),
      total: z.number().int(),
      finishedAt: z.string(),
    }),
  ),
  /** This week's most-missed terms across your classes, at most 5 */
  missedThisWeek: z.array(MissedTerm.extend({ className: z.string() })),
});
export type TeacherOverview = z.infer<typeof TeacherOverview>;

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
  /** Publishing (or saving a published term) failed the publish checks */
  notReady: 'NOT_READY',
  storageNotConfigured: 'STORAGE_NOT_CONFIGURED',
  classNotFound: 'CLASS_NOT_FOUND',
} as const;

export const HealthResponse = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof HealthResponse>;

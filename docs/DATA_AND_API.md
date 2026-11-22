# Data model and API

## Overview

```mermaid
erDiagram
  SCHOOL ||--o{ USER : has
  SCHOOL ||--o{ CLASS : has
  USER ||--o{ CLASS : teaches
  CLASS ||--o{ ENROLLMENT : has
  USER ||--o{ ENROLLMENT : "joins (student)"
  CLASS ||--o{ CLASS_TOPIC : assigned
  SUBJECT ||--o{ TOPIC : has
  USER ||--o{ TOPIC : owns
  TOPIC ||--o{ TERM : contains
  PICTURE ||--o{ TERM : "shown with"
  TERM ||--o{ TERM_VARIANT : accepts
  TERM ||--o{ CONFUSABLE : "must not match"
  USER ||--o{ ROUND : plays
  ROUND ||--o{ ATTEMPT : has
  USER ||--o{ TERM_MASTERY : tracks
```

## Prisma schema (starting point)
```prisma
enum Role {
  STUDENT
  TEACHER
  ADMIN
}
enum Status {
  DRAFT
  PUBLISHED
  ARCHIVED
}
enum Visibility {  // LIBRARY = shared with every school
  PRIVATE
  CLASS
  LIBRARY
}
enum VariantKind {
  ACCEPT
  CLOSE
}
enum RoundStatus {
  ACTIVE
  FINISHED
}
enum PictureState {
  UPLOADING
  PROCESSING
  READY
  FAILED
}

model School {
  id      String  @id @default(cuid())
  name    String
  users   User[]
  classes Class[]
}

model User {
  id           String   @id            // = Supabase auth user id
  role         Role     @default(STUDENT)
  name         String
  schoolId     String?
  school       School?  @relation(fields: [schoolId], references: [id])
  grade        Int?
  xp           Int      @default(0)
  level        Int      @default(1)
  streak       Int      @default(0)
  lastPlayedOn String?            // local date "YYYY-MM-DD" on the student's phone (streaks)
  teaches      Class[]      @relation("ClassTeacher")
  enrollments  Enrollment[]
  topics       Topic[]
  pictures     Picture[]
  rounds       Round[]
  mastery      TermMastery[]
}

model Class {
  id          String   @id @default(cuid())
  name        String              // "Grade 8 – Rizal"
  code        String   @unique    // 6-char join code, e.g. "K7Q2MX"
  schoolId    String
  school      School   @relation(fields: [schoolId], references: [id])
  teacherId   String
  teacher     User     @relation("ClassTeacher", fields: [teacherId], references: [id])
  enrollments Enrollment[]
  topics      ClassTopic[]
}

model Enrollment {
  classId   String
  studentId String
  class     Class @relation(fields: [classId], references: [id])
  student   User  @relation(fields: [studentId], references: [id])
  joinedAt  DateTime @default(now())
  @@id([classId, studentId])
}

model ClassTopic {
  classId String
  topicId String
  dueAt   DateTime?
  class   Class @relation(fields: [classId], references: [id])
  topic   Topic @relation(fields: [topicId], references: [id])
  @@id([classId, topicId])
}

model Subject {
  id     String  @id @default(cuid())
  name   String            // "Chemistry"
  color  String            // brand token name, e.g. "coral"
  topics Topic[]
}

model Topic {
  id             String     @id @default(cuid())
  subjectId      String
  subject        Subject    @relation(fields: [subjectId], references: [id])
  ownerId        String
  owner          User       @relation(fields: [ownerId], references: [id])
  title          String
  grade          Int
  curriculumCode String?
  unlockLevel    Int        @default(1)
  status         Status     @default(DRAFT)
  visibility     Visibility @default(CLASS)
  terms          Term[]
  classes        ClassTopic[]
  updatedAt      DateTime   @updatedAt
}

model Picture {
  id         String       @id @default(cuid())
  ownerId    String
  owner      User         @relation(fields: [ownerId], references: [id])
  storageKey String?                // path in Supabase Storage (null for bundled diagrams)
  diagram    String?                // bundled diagram id, e.g. "atom" (starter library)
  url        String?                // processed WebP (or sanitized SVG) on the CDN
  thumbUrl   String?
  width      Int?
  height     Int?
  state      PictureState @default(UPLOADING)
  altText    String?                // describes the picture without giving the answer
  terms      Term[]
}

model Term {
  id         String   @id @default(cuid())
  topicId    String
  topic      Topic    @relation(fields: [topicId], references: [id])
  position   Int
  canonical  String            // "nucleus"
  display    String            // "Nucleus"
  syllables  String            // "nu·cle·us"
  clue       String
  fact       String
  audioUrl   String?           // generated pronunciation clip
  pictureId  String?          // optional: starter library terms may have none; teachers must add one to publish
  picture    Picture? @relation(fields: [pictureId], references: [id])
  /// Highlight box as fractions of the picture: { "shape": "ellipse"|"rect", "x": 0.41, "y": 0.38, "w": 0.18, "h": 0.2, "badge"?: "left"|"right" }
  /// "badge" optionally picks the side for the "?" badge (default: the roomier side).
  highlight  Json
  difficulty Int      @default(1)
  status     Status   @default(DRAFT)
  version    Int      @default(1)
  variants   TermVariant[]
  confusables Confusable[]
  updatedAt  DateTime @updatedAt
}

model TermVariant {
  id     String      @id @default(cuid())
  termId String
  term   Term        @relation(fields: [termId], references: [id])
  text   String
  kind   VariantKind
  reason String?     // shown when kind = CLOSE
}

model Confusable {
  id        String @id @default(cuid())
  termId    String
  term      Term   @relation(fields: [termId], references: [id])
  otherText String
  feedback  String
}

model Round {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  topicId   String?            // null for practice rounds (specific terms)
  classId   String?            // set when played as a class assignment
  termIds   String[]           // the terms served, in order
  status    RoundStatus @default(ACTIVE)
  lives     Int      @default(3)
  hintsUsed Int      @default(0)
  skipsUsed Int      @default(0)
  streak    Int      @default(0)   // current first-try streak in this round
  bestStreak Int     @default(0)
  startedAt DateTime @default(now())
  endedAt   DateTime?
  score     Int      @default(0)
  summary   Json?              // stored on finish, so finishing twice returns the same summary
  attempts  Attempt[]
}

model Attempt {
  id             String   @id @default(cuid())
  roundId        String
  round          Round    @relation(fields: [roundId], references: [id])
  termId         String
  termVersion    Int
  input          String[]
  inputMode      String            // "voice" | "typed"
  verdict        String            // correct | close | wrong | skipped
  hintsUsed      Int
  ms             Int
  xp             Int      @default(0)
  response       Json?             // the exact response, replayed for a repeated idempotencyKey
  idempotencyKey String   @unique
  createdAt      DateTime @default(now())
}

model TermMastery {
  userId  String
  termId  String
  correct Int      @default(0)
  missed  Int      @default(0)
  dueAt   DateTime
  user    User     @relation(fields: [userId], references: [id])
  @@id([userId, termId])
}
```

**What students can see:** published topics that are either assigned to one of their classes or in the LIBRARY. Enforce this in the API service layer (and optionally with Postgres row-level security as a second guard).

## REST API (v1)
All routes are under `/v1` and need `Authorization: Bearer <supabase-jwt>`. A `RolesGuard` checks the user's role. Teachers can only touch content they own and classes they teach; admins can touch everything.

### Student (mobile app)
| Method | Route | Purpose |
|---|---|---|
| GET | `/me` · PATCH `/me` | Profile, XP, streak, settings |
| POST | `/classes/join` | `{code}` → join a class |
| GET | `/subjects` | Subjects and topics the student can see, with lock and assignment state |
| GET | `/daily` | Today's challenge (Phase 5; the app picks it locally for now) |
| POST | `/rounds` | `{topicId}` or `{termIds}` (practice) → ordered terms **with their answers, variants and confusables**, pictures and highlights, and the round's budgets |
| POST | `/rounds/:id/attempts` | `{termId, alternatives[], inputMode, hintsUsed, ms, idempotencyKey}` → verdict (re-checked on the server) |
| POST | `/rounds/:id/skip` | `{termId, idempotencyKey}` → `{skipsLeft}` |
| POST | `/rounds/:id/finish` | `{localDate}` → summary (XP, level, streak, results); idempotent |
| GET | `/practice` | Terms due for review |
| GET | `/leagues/current` | Weekly league |

### Teacher (dashboard)
| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/teacher/topics` | List / create topics |
| GET/PATCH/DELETE | `/teacher/topics/:id` | Edit, archive |
| POST | `/teacher/topics/:id/publish` | Publish (validates every term) |
| POST | `/teacher/pictures/upload-url` | `{fileName, contentType, size}` → signed upload URL + `pictureId` |
| GET | `/teacher/pictures/:id` | Processing state and URLs |
| POST | `/teacher/topics/:id/terms` | Create a term |
| PATCH/DELETE | `/teacher/terms/:id` | Edit (published terms get a new version) |
| POST | `/teacher/terms/:id/audio` | Regenerate the pronunciation clip |
| POST | `/teacher/terms/confusable-suggestions` | `{answer, topicId}` → similar-sounding terms to tick |
| POST | `/teacher/match-test` | `{termDraft, alternatives[]}` → verdict (for "Test with my voice") |
| POST | `/teacher/import` | CSV + zip → draft terms + a report of problems |
| GET/POST | `/teacher/classes` | List / create classes (generates a join code) |
| PATCH | `/teacher/classes/:id` | Rename, regenerate code |
| PUT | `/teacher/classes/:id/topics` | Assign topics, due dates |
| GET | `/teacher/classes/:id/report` | Accuracy, most-missed terms, what was heard |

### Admin
| Method | Route | Purpose |
|---|---|---|
| POST | `/admin/teachers/invite` | Invite a teacher by email |
| POST | `/admin/topics/:id/promote` | Move a topic into the shared library |
| CRUD | `/admin/subjects`, `/admin/schools` | Reference data |

Example verdict response:
```json
{
  "verdict": "close",
  "matched": "nuclear",
  "feedback": "Close — that's the adjective. You need the noun.",
  "pronunciation": { "syllables": "nu·cle·us", "audioUrl": "https://…/nucleus.mp3" },
  "livesLeft": 2,
  "xpGained": 0
}
```
Errors use one shape: `{ "error": { "code": "ROUND_FINISHED", "message": "…" } }`.

### Built in Phase 3 (decisions)
- **Answers go to the app.** The round includes each term's answer, variants and confusables, so the app can check instantly and offline. The server re-checks every attempt with the same matcher and alone decides the verdict, XP and lives. So there is no server hint endpoint: hints are counted from `hintsUsed` on attempts and capped at the round's budget.
- **Budgets per round** (`ROUND_RULES` in `@blurt/shared/progress`): 3 lives, 3 hints, 2 skips, at most 10 terms.
- **Idempotency:** an attempt or skip sent again with the same `idempotencyKey` returns the stored response. Finishing twice returns the stored summary, and XP is added once (the finish transaction claims the round).
- **Streak** uses the phone's local date sent on finish (`nextStreak`). A round with no answers keeps the streak.
- **Visibility:** students see published topics in the shared library (`visibility = LIBRARY`); class-assigned topics arrive with Phase 4. Someone else's round returns 404, never 403, so round ids don't leak.
- **Error codes:** `ROUND_FINISHED`, `OUT_OF_LIVES`, `NO_SKIPS_LEFT`, `TERM_NOT_IN_ROUND`, `TERM_DONE`, `TOPIC_LOCKED` (`ERROR_CODES` in `@blurt/shared/schemas`).
- **Starter library:** `pnpm --filter api db:seed` loads the 30 Grade 8 terms, the 7 diagrams (`Picture.diagram`) and the 4 subjects, owned by a `library` system user. It's safe to run again.

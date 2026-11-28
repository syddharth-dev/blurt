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
  email        String?  @unique  // from Supabase Auth; lets admins find and invite people
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
  schoolId    String?            // optional until schools are set up (admin reference data)
  school      School?  @relation(fields: [schoolId], references: [id])
  createdAt   DateTime @default(now())
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
  highlight  Json?             // null until the teacher marks the part to name
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
  terms     Json?              // snapshot of those terms as served, so edits mid-round don't change them
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
| POST | `/classes/join` | `{code}` → join a class (10 tries a minute) |
| GET | `/classes` | My classes with their published assigned topics and due dates |
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
| POST | `/teacher/pictures/:id/complete` | The browser finished uploading → processing starts (safe to repeat) |
| GET | `/teacher/pictures/:id` | Processing state and URLs |
| PATCH | `/teacher/pictures/:id` | `{altText}` |
| POST | `/teacher/topics/:id/terms` | Create a term |
| PATCH/DELETE | `/teacher/terms/:id` | Edit (published terms get a new version) |
| POST | `/teacher/terms/:id/audio` | Regenerate the pronunciation clip (not built: Phase 4 uses the device voice instead) |
| POST | `/teacher/terms/confusable-suggestions` | `{answer, topicId}` → similar-sounding terms to tick |
| GET | `/teacher/terms/:id` | One term with its publish checks (for the editor) |
| PUT | `/teacher/topics/:id/terms/order` | `{termIds}` → new play order |
| POST | `/teacher/topics/:id/duplicate` | Draft copy (own topics, or any published library topic) |
| GET | `/teacher/library` | Published starter-library topics to copy |
| GET | `/teacher/subjects` | Subjects for the topic form |
| POST | `/teacher/match-test` | `{termDraft, alternatives[]}` → verdict (for "Test with my voice") |
| POST | `/teacher/import` | CSV + zip → draft terms + a report of problems |
| GET/POST | `/teacher/classes` | List / create classes (generates a join code) |
| GET | `/teacher/classes/:id` | Code, roster and assigned topics |
| PATCH | `/teacher/classes/:id` | Rename (`name`), regenerate code (`newCode: true`) |
| PUT | `/teacher/classes/:id/topics` | `{topics: [{topicId, dueOn}]}`: the full list of assigned topics |
| DELETE | `/teacher/classes/:id/students/:studentId` | Remove a student |
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
- **Visibility:** students see published topics in the shared library (`visibility = LIBRARY`) and, since Phase 4 step 5, published topics assigned to one of their classes (`src/common/visibility.ts`). Someone else's round returns 404, never 403, so round ids don't leak.
- **Error codes:** `ROUND_FINISHED`, `OUT_OF_LIVES`, `NO_SKIPS_LEFT`, `TERM_NOT_IN_ROUND`, `TERM_DONE`, `TOPIC_LOCKED` (`ERROR_CODES` in `@blurt/shared/schemas`).
- **Starter library:** `pnpm --filter api db:seed` loads the 30 Grade 8 terms, the 7 diagrams (`Picture.diagram`) and the 4 subjects, owned by a `library` system user. It's safe to run again.

### Built in Phase 4 step 2 (decisions)
- **Who can touch what:** teacher routes are `@Roles('TEACHER')` (admins pass too). `TeacherService` then checks the topic's owner: anyone else gets **403** (`FORBIDDEN`), admins can open everything, and a missing topic or term is 404. Tests cover every route.
- **Teacher topics** are created as `DRAFT` with `visibility = CLASS`. Students see them once they're assigned to a class (step 5).
- **Publishing:** `POST /teacher/topics/:id/publish` runs `termChecks` (`@blurt/shared/authoring`) on every live term and answers **422 `NOT_READY`** with what's missing. A term can also be published on its own (`publish: true` on create or PATCH). Saving a published term must still pass the checks.
- **Versions:** a changed published term gets `version + 1`. Rounds store the terms they served in `Round.terms` and check attempts against that snapshot, so a round in progress never changes under a student. Attempts record `termVersion`.
- **Deleting:** `DELETE /teacher/terms/:id` deletes a draft and archives a published term. `DELETE /teacher/topics/:id` archives; archived topics refuse edits (409 `TOPIC_ARCHIVED`).
- **Pictures on terms:** a term may point at the teacher's own picture or a bundled diagram, never another teacher's (403).
- `Term.highlight` is nullable (null until the part to name is marked).

### Built in Phase 4 step 3 (decisions)
- **Upload flow:** `POST /teacher/pictures/upload-url` checks the claimed type and size (max 5 MB, `PICTURE_RULES`), creates the `Picture` row (`UPLOADING`), and returns `{pictureId, bucket, path, token}`. The path is always `<teacherId>/<pictureId>`, never the file name. The browser uploads with `uploadToSignedUrl`, then calls `/complete`, which moves the row to `PROCESSING` exactly once and queues the job.
- **The job** (`PictureJobs`): download → `processPicture` (real type from the bytes, sanitize and rasterize SVG, rotate, max 1600 px WebP + 320 px thumbnail, no metadata) → public `pictures` bucket → `READY` with `url`, `thumbUrl`, `width`, `height`. Failures end `FAILED`. The original upload is always deleted.
- **Access:** a teacher sees and changes only their own pictures (403 otherwise, tested); admins see all; bundled diagrams can be viewed by any teacher but not changed. A term may use only a `READY` picture to publish.
- **Rate limit:** 30 upload URLs a minute per client. Without the secret key, upload-url answers 503 `STORAGE_NOT_CONFIGURED`.

### Built in Phase 4 step 4 (decisions)
- `POST /teacher/match-test` takes `{term: {canonical, accept, close, confusables}, alternatives, inputMode}` (`MatchTestRequest`) and returns `{verdict, matched, feedback, strategy}`. It runs `matchAnswer` from `@blurt/shared/matcher`, the function used for students' attempts. It reads and stores nothing, so it has no owner check; it is teachers only (a student gets 403, tested) and limited to 120 a minute.
- **Pronunciation** uses the device's voice in the app and the dashboard, so there is no audio job and `audioUrl` stays null for now.

### Built in Phase 4 step 5 (decisions)
- **Who can see a topic:** the topic is published, and it's either in the library or assigned to a class the student is in. `/subjects`, starting a round, and practice terms all use this one rule (`visibleTopic` in `apps/api/src/common/visibility.ts`). Topics assigned to a student's class are never locked by level (`assigned` on `TopicSummary`).
- **Classes:** a teacher manages only the classes they teach. Another teacher gets **403** on every class route (tested); admins can manage any. `Class.schoolId` is optional until schools are set up (admin reference data, later), and classes have a `createdAt`.
- **Join codes:** 6 characters from `CLASS_CODE_ALPHABET` (no 0/O, 1/I/L), unique, made with `crypto.randomInt` and retried on the rare clash. A wrong code is 404 `CLASS_NOT_FOUND`. Joining twice is fine (`alreadyMember: true`).
- **Assigning:** your own topics or published library topics (another teacher's: 403). Students only see published ones. Due dates are days (`dueOn`, "YYYY-MM-DD"), stored at noon UTC so no time zone moves them.
- **Pictures in rounds:** `RoundPicture` now carries `width` and `height`, and `url` only once the picture is `READY`. The app fits the picture inside the panel and places the highlight on the picture's own area.

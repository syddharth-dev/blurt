# Teacher dashboard

A web app (desktop-first, works on tablets) where teachers create the content students play: they upload a picture, type the word, mark the part to name, and publish it to their classes.

**Assumptions** (change here if your plan differs):
- A teacher's terms are visible to **the classes they teach**. An **admin** can promote good terms into the shared library that all schools can use.
- Students only use the mobile app. Teachers and admins only use the dashboard.

## Roles

| Role | Can do |
|---|---|
| `student` | Play, join classes with a class code |
| `teacher` | Create/edit their own topics and terms, manage their classes, assign topics, see reports for their classes |
| `admin` | Everything teachers can, for every school. Curate the shared library, manage teacher accounts |

Teacher accounts are created by an admin invite (or approved after sign-up), so students can't make themselves teachers.

## Pages

**Built (Phase 4, step 1):**
- **Sign-in:** email plus a code. Teachers are invited, so the dashboard never creates accounts.
- **Role gate:** student accounts see a friendly "this dashboard is for teachers" page.
- **Shell:** the sidebar, plus an Overview placeholder.
- **Teachers page (admins only):** invite by email (a new email gets the branded invite; an existing student account is promoted), and the list of teachers and admins. API: `POST /admin/teachers/invite` and `GET /admin/teachers`, both `@Roles('ADMIN')`, with tests proving students and teachers get 403.
- **The first admin** is made with `pnpm --filter api make-admin`.
- Code: `apps/dashboard/src/`. The signed-in area renders only in the browser (`use(browser())` in a Suspense boundary), since the session lives in localStorage.

**Built (Phase 4, step 2): topics and the term editor**
- **Topics page:** your topics (subject, grade, terms, "N to fix", status, classes), a New topic form, Duplicate and Archive. Below it, the **starter library**: any teacher can copy a published library topic into a draft of their own.
- **Topic editor:** title, subject, grade, curriculum code; the terms in play order (drag a row, or use the ↑ ↓ buttons, which work from the keyboard); Publish. Publishing checks every term and publishes the drafts with the topic.
- **Term editor:** every field in the table below except the picture upload, highlight drawing, phone preview, "Test with my voice" and pronunciation, which come in steps 3–4. The display name and syllables are suggested from the answer (`suggestSyllables`). The left column shows the picture (starter diagrams render with their highlight) and the live **Ready to publish?** checklist.
- **Confusable suggestions:** a yellow "Students might mix it up with" box lists terms from the same topic and the library in that subject that sound alike, are spelled alike, share an ending, or already list this answer. Ticking one adds it to "Never accept" with editable feedback.
- **One set of rules:** `@blurt/shared/authoring` (`termChecks`, `suggestConfusables`, `suggestSyllables`) runs in the dashboard for the live checklist and in the API, which refuses to publish anything that fails.
- **Versions:** saving a published term must keep it ready, and bumps its version when anything changed. Each round stores a snapshot of its terms (`Round.terms`), so rounds in progress keep the old version.
- **Deleting:** a draft term is deleted. A published term is archived (hidden, but kept for past results). Topics are only ever archived; an archived topic is read-only, and Duplicate brings it back as a draft.
- **Clue check:** a clue that contains the answer gets a warning (not a blocker).
- **Library terms** (the starter set) may publish without a picture; teachers' terms need one.
- Code: `apps/dashboard/src/features/topics/`, `apps/api/src/teacher/`.

**Built (Phase 4, step 3): pictures**
- **Upload:** in the term editor, drop or choose a PNG, JPG, WebP or SVG (max 5 MB). The dashboard gets a signed URL from the API and uploads straight to the private `uploads` bucket, then tells the API it's done. While the picture is processed, the editor shows "Getting it ready…" and checks every second.
- **Processing** (in the API, `src/media/`): the real type is read from the file's first bytes (the name and claimed type are never trusted). The picture is rotated upright, resized to max 1600 px, saved as **WebP** with a 320 px thumbnail, and all metadata (EXIF, location) is dropped. The original upload is then deleted. Anything unreadable ends as `FAILED`, with a plain message in the editor.
- **SVGs are sanitized and then turned into WebP.** Files with a DOCTYPE are refused; scripts, event handlers, `foreignObject` and links to anything outside the file are removed; then the SVG is rasterized. So the app and dashboard never show an SVG at all, which is safer than serving a cleaned SVG. (Decision for step 3; the original plan said "sanitized SVG".)
- **The background job** runs inside the API for now (2 at a time); pictures left mid-processing by a restart are picked up again at startup. It moves to BullMQ with Redis in Phase 5.
- **Highlight drawing:** drag over the picture to draw, drag the box to move it, drag the corner to resize. From the keyboard: Tab to the box, then arrow keys move it and Shift + arrow keys resize it. Choose an oval or a box, and which side the "?" badge goes on (Auto = the roomier side, the same rule as the app). Replacing the picture clears the highlight.
- **Alt text:** "Describe the picture" is saved on the picture for screen readers. If it's empty, the checklist gives a warning (not a blocker).
- **Phone preview:** a still Play card: the picture on lilac, the sunny glow and dashed ring around the part, the "?" badge, and Pip's bubble with the clue.
- With a ready picture and a highlight, teachers can now publish their own terms.
- The app shows uploaded pictures from step 5 (with classes), when students can first receive teacher topics.

**Built (Phase 4, step 4): Test with my voice and pronunciation**
- **Test with my voice** (left column of the term editor): "Start listening" uses the browser's speech recognition (Chrome and Edge; Safari as `webkitSpeechRecognition`), with up to 5 guesses per phrase. What was heard goes to `POST /teacher/match-test` with the term **as it is in the editor, saved or not**, and the server's matcher, the same one students are checked with, answers. The result shows Correct / Close / Not accepted (icon, text and colour), which matcher step decided ("listed under Never accept", "sounds like the answer"…), Pip's feedback, and the recognizer's other guesses. If it isn't correct, a tip suggests adding the word under "Also accept".
- **Typing** a phrase works in every browser (for Firefox, or to test spellings).
- **Play pronunciation** uses the browser's voice (`speechSynthesis`, en-US, a little slower).
- Code: `apps/dashboard/src/features/topics/VoiceTest.tsx`.

**Built (Phase 4, step 5): classes**
- **Classes page:** your classes (name, join code, students, topics) and a New class form.
- **Class page:**
  - the **join code** in large type, with Copy and New code (the old code stops working; students already in stay in);
  - rename;
  - **assigned topics**: add your published topics or starter-library topics, set an optional due date, remove, then Save topics;
  - the **roster**, with Remove (the student can rejoin with the code).
- **Join codes** are 6 characters without look-alikes (no 0/O, 1/I/L), typed in any case. Joining is limited to 10 tries a minute so codes can't be guessed.
- **Students** join in the app (Topics → "Join a class"). They then see the class's published topics first on the Topics tab, soonest due date first, and those topics are never locked by level. Uploaded pictures show in the app with the highlight drawn on top.
- The Topics list shows which classes each topic is assigned to.
- Reports per class: see Phase 5 step 1 below.
- Code: `apps/dashboard/src/features/classes/`, `apps/api/src/classes/`.

**Built (Phase 5, step 1): reports and the Overview**
- **Overview** (`/`): each class this week (students who played, rounds, accuracy), this week's most-missed terms across your classes, and the latest finished rounds.
- **Reports** (sidebar) lists your classes. Each **class report** (`/classes/:id/report`, also "See report" on the class page) has a 7-day / 30-day / all-time switch:
  - tiles for accuracy, active students, rounds and answers;
  - the 10 **most-missed terms**, with what students said instead (text only, normalized, counted);
  - the students, weakest first, with accuracy, rounds, "to practise" (terms whose latest try wasn't right) and when they last played.
- Click a student for their **student report**: every term they've tried in the class's topics, weakest first, with what they said.
- **What counts:** answers by students in the class, on terms from topics assigned to it, in any kind of round (topic, practice or daily). Answers are spoken or typed tries; skips count as misses but not as answers. Accuracy = right ÷ answers.
- Bars use one colour (violet), and each bar's value is also shown as text.
- Code: `apps/dashboard/src/features/reports/`, `apps/api/src/reports/` (the maths is the pure `build-report.ts`).


1. **Sign in** (Supabase Auth, same accounts as the app).
2. **Overview**: my classes, recent activity, terms students miss most this week.
3. **Topics**: list with subject, grade, number of terms, status (Draft / Published), and which classes it's assigned to. Create, duplicate, archive.
4. **Topic editor**: title, subject, grade, curriculum code, then the list of terms (drag to reorder).
5. **Term editor**, the main screen (details below).
6. **Bulk import**: upload a CSV (term, clue, fact, variants, confusables) plus a zip of pictures matched by file name. Every imported term arrives as a Draft for review.
7. **Classes**: create a class, get a **class code** students type in the app, see the roster, assign topics with optional due dates.
8. **Reports**: per class and per student: accuracy, terms most often missed, what students actually said for missed terms (text only).
9. **Library** (admin): shared terms; promote a teacher's term into it, or copy a library term into your own topic.

## Term editor (main screen)

Left: the picture, as students will see it. Right: the form. A live **phone preview** shows the Play card with the glow.

| Field | Required | Notes |
|---|---|---|
| Picture | ✓ | Drag and drop PNG, JPG, WebP or SVG. Max 5 MB. |
| **Highlight** | ✓ | The teacher drags a box (or ellipse) over the part to name. Stored as fractions of the image size (0–1), so it fits any screen. A picture can be reused by several terms with different highlights. |
| Answer (word) | ✓ | e.g. "nucleus" |
| Display name | | Defaults to the answer with a capital letter |
| Syllables | | Auto-suggested ("nu·cle·us"), editable |
| Clue | ✓ | One sentence, shown as the first hint |
| Quick fact | ✓ | One sentence, shown after a correct answer |
| Also accept | | Plurals, spellings: "nuclei" |
| Close (word family) | | "nuclear", with the reason shown: "that's the adjective" |
| Never accept (confusables) | | "neutron", with feedback. **The dashboard suggests these automatically** from similar-sounding terms in the same topic; the teacher ticks the ones that apply. |
| Difficulty | | 1–3 |

Buttons:
- **Test with my voice**: uses the browser's microphone and speech recognition (works in Chrome and Edge) and runs the *same matcher* the server uses, showing "Correct / Close / Wrong" and what was heard. Teachers catch recognition problems before students do.
- **Play pronunciation**: says the answer with the browser's built-in voice, as the app does with the phone's voice (Phase 4 decision: no pre-made audio clips).
- **Save draft** / **Publish**. Only published terms reach students. Editing a published term creates a new version; rounds already in progress keep the old one.

Validation before publishing: picture uploaded, highlight set, answer, clue and fact filled, and the answer isn't also listed as a confusable.

## What happens when a teacher uploads a picture
1. The dashboard asks the API for a **signed upload URL**.
2. The browser uploads the file straight to Supabase Storage (the API never handles large files).
3. A background job checks the file type, strips location metadata (EXIF), resizes to max 1600 px, converts to **WebP**, and creates a small thumbnail. SVGs are sanitized (scripts and external links removed).
4. The picture record is marked `ready` and the editor shows it.

## How the app shows a teacher's picture
The Play screen's picture card shows the image (`contain`, on the lilac background) and **draws the highlight itself** from the stored box: the pulsing sunny glow, rotating dashed ring, leader line and "?" badge. Every picture looks on-brand however it was made.

## Design
Same brand as the app (`BRAND.md`), adapted for desktop: a light lilac background instead of scenes, Pip only on empty states and success messages, violet as the main action colour on white (sunny is reserved for student-facing celebration), and a left sidebar for navigation. No ambient animation.

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
- **Play pronunciation**: the clip generated automatically when the term is saved. Regenerate if it sounds wrong.
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

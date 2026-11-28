# Screens

All screens are designed at 390×844 pt (a standard modern phone) and must flex for smaller and larger phones. Use safe-area insets, not fixed top padding.

## 1. Home
Background: `scene-day`, two drifting atoms, twinkling sparkles.

1. **Top bar**: avatar (initial on coral with a sunny ring), streak pill (flame + "12 days"), gems pill.
2. **Wordmark**: `blurt` + a wiggling sunny `!`.
3. **Pip (wave)** with a speech bubble: "Hey, I'm Pip." / "Ready to name some science?"
4. **Daily challenge card** (white): coral "Daily · 6h left" tag, topic title, chips (`10 terms`, `Grade 8`, `+150 XP`), a fanned stack of three mini picture cards (the front one shows "?"), and a primary button "Let's blurt" that opens Play.
5. **Your topics**: a horizontal, snap-scrolling row of topic cards (see BRAND components). The third card deliberately peeks in from the edge.
6. **Tab bar** (white, floating): Play · Topics · League · Me. (The design canvas labels the second tab "Decks"; these docs say Topics, and the app follows the docs.)

**Built (Phase 5):** under the daily challenge, a quiet **Practice · N due** card (`components/PracticeCard.tsx`) shows when terms are due for review (spaced repetition, `GET /practice`). Tapping it starts a practice round with exactly those terms (up to 10). It only shows when signed in.

**Built (design pass, before Phase 3):** `apps/mobile/src/features/home/`. The daily topic rotates by local date, and "Xh left" counts down to local midnight. The "+150 XP" daily bonus (`DAILY_BONUS_XP`) is shown now and awarded by the server from Phase 3. Streak, gems and topic progress show 0 until progress is saved (Phase 3). Topics lists every topic plus a mixed round. League and Me are placeholders, and Me holds the developer links in development builds only.

## 2. Play (one screen, five states)
Background: `scene-lab-night`, drifting atoms, stars.

Layout, top to bottom: HUD → picture card → letter tiles → Pip + bubble → control dock → "Type it instead".

- **HUD**: quit (X), topic name + "3 / 10", a 10-segment progress bar (done = sunny, current = pulsing white), lives (coral heart + count). Lives belong to the whole round (3). Losing the last one reveals the term and ends the round.
- **Picture card**: 250 px white card floating over a slowly spinning sunburst. Inside is the **picture** (a built-in diagram or one a teacher uploaded) with the target part highlighted. The app draws the highlight from the term's stored box (see `TEACHER_DASHBOARD.md`), by a pulsing sunny glow, a rotating dashed ring, and a leader line to a "?" badge. A coral tag at top-left shows "Grade 8 · Chemistry".
- **Letter tiles**: one per letter. The first letter is revealed by default.

| State | Pip | Bubble | Dock / bottom |
|---|---|---|---|
| **Idle** | idle | "Name the glowing part" + "Tap the mic and say the term." | Hint (Clue) · Mic "Tap to speak" · Skip |
| **Listening** | listening | "Listening…" + live partial transcript in a dashed "Heard" chip | Mic turns coral with a waveform and rings, "Tap to stop" |
| **Evaluating** | listening | Same, final transcript shown | Mic disabled for up to ~300 ms while the server responds |
| **Close** | oops | "Close — that's the adjective" + reason + coral "Heard: nuclear" chip + **"nu·cle·us" pronunciation button** | Tiles shake. Mic "Try again". One life lost. |
| **Wrong (confusable)** | oops | "That's the proton. This one has no charge." | Same as close |
| **Correct** | celebrate | "Nucleus. Nailed it." + "+100 · 3 in a row" | Tiles pop yellow, the "?" badge becomes the term, "+100" rises, confetti. Dock is replaced by a **Quick fact** card + "Next term" button. |

**Hints:** the first press shows a **clue** in the bubble, and each later press reveals the next letter. The button label shows what you'll get next (Clue → Letter). Each press costs one hint. A round has 3 hints and 2 skips, shown on the side buttons' count badges. Hints never reveal the whole word.

**Type it instead** opens a text field with the same matching. Always available (noisy room, mic denied, speech differences).

**Mic permission**: on the very first round, show Pip (listening) with a one-line explanation *before* the OS prompt. If permission is denied, Play switches to typed mode with a link to Settings.

**Built (Phase 2):** `apps/mobile/src/features/play/`. For now, Home has a "Let's blurt" button (a mixed round of 10 terms) and one button per topic. Until a term has a picture, its card shows the clue, and the first hint reveals a letter. The pronunciation button shows the syllables and, since Phase 4, says the term with the phone's voice (`expo-speech`; needs a development build made after it was added). 15 of the 30 starter terms have a bundled diagram (atom, animal cell, cell division, plant cell, earthquake, food chain, solar system). The glow, ring, leader line and badge are drawn by `PictureCard` from the term's highlight box. Box-shaped highlights glow more softly and use a still dashed frame instead of a rotating ring. The speech language is fixed to en-US until the Profile screen adds a setting.

**Built (Phase 4):** the Topics tab starts with the student's classes (`features/topics/ClassTopics.tsx`): each class's published topics, soonest due date first, with a coral "Due Fri" / "Due today" / "Overdue" tag on the card. Without a class, a card offers "Join a class", which opens `app/join-class.tsx` (`features/classes/JoinClassScreen.tsx`): type the 6-character code, then "You're in". Class topics need a connection; offline, the starter topics below still work. The Play card draws teachers' uploaded pictures (fitted inside the lilac panel) with the same glow, ring and badge.

## 3. Round summary
Background: `scene-day`, big slow sunburst, confetti.

1. Three stars pop in one after another (earned stars are sunny, the missing star is glass).
2. Pip (celebrate) + "Amazing!" + score "8/10".
3. XP bar animates from the old to the new value, with the level shown.
4. Stats: First try · Best streak · To practise.
5. **Term review list**: coloured dot (violet = first try, sunny = needed a hint or retry, coral = missed), term, one-line meaning, and a note (e.g. *Heard "ice a tope"*).
6. Buttons: "Play again" (primary), "Practise 2 tricky terms" (outline).

**Built (design pass):** `apps/mobile/src/features/summary/`.
- **Stars:** 3 at 90 %+ right, 2 at 60 %+, 1 for any right answer (`starsFor` in `packages/shared/src/progress`).
- **Headline** by stars: Amazing! / Nice work! / Good start! / Keep going!. When the round ended out of lives: So close! / Good effort!.
- **"To practise"** counts every term that wasn't a first try. "Practise N tricky terms" starts a practice round with exactly those terms (`/play/practice?ids=…`).
- **XP bar** uses the level rule (every 500 XP; pending confirmation). The XP total lasts only for the session until Phase 3 saves it.

## 4. Screens still to design
Onboarding (choose grade, **enter class code**; for now the class code is entered from Topics → "Join a class", built in Phase 4) · Sign in (built in Phase 3: email, then a 6-digit code, with Pip waving; the design is a first pass, since it's not on the canvas) · Topic list and topic detail (assigned topics with due dates first) · League (weekly leaderboard) · Profile and settings (speech language, reduce motion, sound). Teacher dashboard pages are listed in `TEACHER_DASHBOARD.md`.

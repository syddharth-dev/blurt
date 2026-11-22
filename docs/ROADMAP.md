# Build roadmap

Build the riskiest part first: **speech on a real phone with real science words**.

### Phase 0 — Setup (week 1) ✅
Monorepo, Expo app, NestJS API, Supabase project, theme tokens from `BRAND.md`, fonts, CI.

### Phase 1 — Speech spike (week 1–2)
A bare screen: tap mic, show partial and final alternatives, run the shared matcher locally against ~30 Grade 8 terms. Test with real students and accents. **Don't build anything else until this feels reliable.** Tune `contextualStrings`, variants and confusables here.

Status: built. The shared matcher (`packages/shared/src/matcher`), the speech port with native and mock adapters (`apps/mobile/src/shared/speech`), a draft of 30 Grade 8 terms (`packages/shared/src/content/grade8.ts`, **needs a science teacher's review**), and the **Speech lab** screen (`apps/mobile/src/features/speech-lab`, route `/speech-lab`, linked from Home). The lab shows partial and final alternatives, the verdict for each alternative, Type it instead, and language / on-device / model switches, and it can share a session log. Still to do: test on real Android phones with students, then tune.

### Phase 2 — Playable round (weeks 2–4)
Round state machine, Play screen with all states, letter tiles, hints, Type it instead, Pip built with react-native-svg + Reanimated (all five moods, see MASCOT.md), the night scene and ambient motion. Content is still local JSON.

### Phase 3 — Online (weeks 4–6)
Auth, content API, rounds/attempts API with the server-side matcher, XP, streaks, summary screen, offline queue, prefetching a topic's assets.

### Phase 4 — Teacher dashboard (weeks 6–8)
Roles and teacher invites, topic and term editor, picture upload + processing + highlight drawing, "Test with my voice", confusable suggestions, pronunciation audio job, classes with join codes, assigning topics. Students join classes in the app.

### Phase 5 — Engagement and reports (weeks 8–10)
Home and daily challenge, assigned topics with due dates, class reports for teachers, CSV bulk import, topics with unlocks, spaced-repetition practice, leagues, haptics and sounds, Pip polish (timing, mood blends, performance on low-end phones).

### Phase 6 — Launch prep
Accessibility pass (Reduce Motion, screen readers, contrast), privacy policy suited to minors, Sentry and PostHog, beta through TestFlight and Google Play internal testing, a pilot with one teacher and their classes.

### Later
Shared library across schools, live class game mode (teacher projects, students answer), more languages, a cloud speech fallback for low-end phones.

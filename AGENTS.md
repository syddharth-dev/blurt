# Instructions for AI coding assistants

You are helping build **Blurt!**, a speech-based science vocabulary game for high school students. Read the relevant file in `docs/` before writing code for a feature.

## Stack (do not swap without asking)
- Mobile: Expo (React Native) + TypeScript (strict), Expo Router, Reanimated, react-native-svg (Pip is built with these two, see docs/MASCOT.md), Zustand, TanStack Query, XState for the round state machine, expo-speech-recognition.
- Backend: NestJS + TypeScript, PostgreSQL via Prisma, Redis, Supabase Auth + Storage.
- Teacher dashboard: Next.js (App Router) + TypeScript, Tailwind with the brand tokens, TanStack Query, react-hook-form + Zod.
- Shared types and the answer matcher live in `packages/shared` and are imported by the app, the dashboard and the API.

## Rules
1. **Design tokens only.** Never hard-code a colour, font size, radius or duration. The values live in `packages/shared/src/theme` (mirroring `docs/BRAND.md`). Mobile code imports them from `@/theme` (`apps/mobile/src/theme`); the dashboard uses the Tailwind classes generated from them (`pnpm --filter dashboard gen:tokens`).
2. **Pip's mood is derived, never set by hand.** It comes from the round state machine (`docs/MASCOT.md` → "Mood mapping").
3. **The server decides if an answer is right.** The client sends the recognizer's alternatives; the backend's matcher returns the verdict and XP (`docs/SPEECH_AND_MATCHING.md`). Client-side matching is only an optimistic preview.
4. **Confusable terms must never match each other** (proton ↔ neutron, mitosis ↔ meiosis). Any fuzzy-matching change needs a unit test proving this.
5. **Copy follows Pip's voice**: short, encouraging, never childish or mocking. Say "Close — that's the adjective", never "Wrong".
6. **Accessibility**: touch targets ≥ 44 pt, text contrast ≥ 4.5:1, every icon-only button has an accessibilityLabel, every animation respects Reduce Motion, and "Type it instead" is always available.
7. **Feature folders.** New code goes in `src/features/<feature>/` (see `docs/ARCHITECTURE.md`). No cross-feature imports except through `src/shared`.
8. Write tests for matchers, state machines and services. UI snapshot tests are optional.
9. **Authorization on every teacher route**: a teacher may only read or change topics, terms and pictures they own and classes they teach. Write a test for each new route proving another teacher gets 403.
10. Uploaded pictures go straight from the browser to storage via signed URLs, and are processed by a background job (resize, WebP, strip EXIF, sanitize SVG). Never trust the file name or type sent by the client.
11. Never commit secrets. Config comes from `.env` files listed in `.env.example`.

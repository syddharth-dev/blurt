# Tech stack

The guiding choice: **one language (TypeScript) everywhere**, managed services for the boring parts, and your own code only where the game is unique (rounds, matching, XP).

## Mobile app (frontend)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (React Native) + TypeScript** | One codebase for Android and iOS, fast refresh, cloud builds with EAS. |
| Navigation | **Expo Router** | File-based routes, deep links for free. |
| Animation | **react-native-reanimated** | Runs animations on the UI thread, which you need for 60 fps backgrounds. |
| Vector art | **react-native-svg** | Diagrams, icons, scenes. |
| Mascot | **react-native-svg + Reanimated** | Pip is drawn as SVG layers and animated in code: free, no extra tools (full build guide in MASCOT.md). Rive is an optional paid upgrade later. |
| Blur / glass | **expo-blur** | Glass dock and chips. |
| Speech-to-text | **expo-speech-recognition** | Uses each phone's built-in recognizer (often on-device, free, fast), returns live partial results and alternatives, and accepts word hints. |
| Audio | **expo-audio** + **expo-haptics** | Pronunciation clips, sound effects, haptics on correct and wrong answers. |
| Round logic | **XState** | The round is a real state machine (idle → listening → evaluating → correct/close/wrong). |
| Client state | **Zustand** | Small global state (settings, session). |
| Server state | **TanStack Query** | Caching, retries, offline persistence of topics and progress. |
| Local storage | **react-native-mmkv** | Fast key-value cache, offline queue. |
| Forms / validation | **Zod** | Same schemas shared with the backend. |
| Testing | Jest + React Native Testing Library, **Maestro** for end-to-end flows | |

## Backend

| Concern | Choice | Why |
|---|---|---|
| API | **NestJS (Node.js + TypeScript)** | Modules, dependency injection and guards give the structure a growing app needs. |
| Database | **PostgreSQL** (hosted on **Supabase**) | Relational data (users, topics, terms, attempts) and strong integrity. |
| ORM | **Prisma** | Type-safe queries, migrations. |
| Auth | **Supabase Auth** (email + Google sign-in) | Don't build auth yourself. The API verifies Supabase JWTs. |
| File storage / CDN | **Supabase Storage** | Diagrams (SVG) and pronunciation audio (MP3) served from a CDN. |
| Cache / leaderboards | **Redis** (e.g. Upstash) | Sorted sets make weekly leagues trivial. Also used for rate limits. |
| Background jobs | **BullMQ** (on Redis) | Streak resets, league rollover, generating pronunciation audio. |
| Text-to-speech | **expo-speech** (phone) and `speechSynthesis` (dashboard) | Phase 4 decision: the device's built-in voice says the term. Free and offline. A cloud TTS service (Google, Azure or ElevenLabs) for pre-made clips stays an option for later. |
| Cloud speech fallback (optional, later) | Azure AI Speech (has pronunciation assessment) or Google Cloud Speech-to-Text (phrase hints) | For phones with weak built-in recognition, or to score pronunciation. |
| Validation | Zod (shared) or class-validator | |
| Docs | OpenAPI via `@nestjs/swagger` | Auto-generated API reference. |

## Why NestJS?
- **Same language as the app.** TypeScript on both sides, so the answer matcher, Zod schemas and types in `packages/shared` are used by the app and the API without rewriting anything.
- **Structure built in.** Modules, dependency injection, guards and pipes map directly onto the patterns in `ARCHITECTURE.md` (repository, events, validation). Plain Express leaves all of that for you to invent, and that's where small backends get messy.
- **AI assistants write consistent NestJS code.** Its conventions are strict and well known, so generated code lands in the right place instead of a new style every time.
- **Batteries included:** testing setup, OpenAPI docs, scheduled jobs, WebSockets (useful for live class games later).

The trade-off: more boilerplate than a minimal framework, and it's a server you must deploy and keep running. Lighter alternatives are **Fastify** or **Hono**. If you don't want to run a server at all, see "Cheaper MVP path" below.

## Teacher dashboard (web)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Fast to build data-heavy pages, easy to host. |
| Styling | **Tailwind CSS** with the brand tokens from `BRAND.md` | Consistent with the app's colours and type. |
| UI components | **shadcn/ui** (tables, dialogs, forms) | Accessible building blocks you own and restyle. |
| Data | **TanStack Query** + the same API | One backend for app and dashboard. |
| Forms | **react-hook-form + Zod** (schemas from `packages/shared`) | Same validation as the API. |
| Highlight drawing | A small canvas/SVG overlay component (drag to draw, handles to resize) | Stores the box as fractions of the image. |
| Voice test | Browser Web Speech API (Chrome/Edge) + the shared matcher | Teachers test terms before publishing. |
| Image processing | **sharp** in a BullMQ worker on the API side | Resize, WebP, thumbnails, strip EXIF. SVGs are sanitized with DOMPurify. |
| Hosting | **Vercel** (or a second Railway service) | See `DEPLOYMENT.md`. |

## Infrastructure and tooling
- **Monorepo:** pnpm workspaces + Turborepo → `apps/mobile`, `apps/api`, `apps/dashboard`, `packages/shared`.
- **Hosting:** API on Railway (or Render / Fly.io). Database, auth and storage on Supabase. Steps in `DEPLOYMENT.md`.
- **Mobile builds and updates:** EAS Build, EAS Submit, EAS Update (over-the-air JS fixes).
- **Monitoring:** Sentry (app + API), PostHog (product analytics and feature flags).
- **CI:** GitHub Actions running lint, typecheck, tests and Prisma migration checks on every pull request.
- **Code quality:** ESLint, Prettier, TypeScript `strict`, Husky pre-commit.

## Versions at setup (November 2026)
Expo SDK 58 (React Native 0.88, React 19.3) · NestJS 12 (ESM only, Vitest, oxlint) · Prisma 7 (the connection URL lives in `apps/api/prisma.config.ts`, with the `@prisma/adapter-pg` driver) · Next.js 16 + Tailwind CSS 4 · TypeScript 6 · Zod 4 · pnpm 11 + Turborepo 2.

Linters: each app keeps the linter its framework ships (`expo lint` for mobile, ESLint for the dashboard, oxlint for the API and `packages/shared`). Prettier formats everything.

## Getting started (commands)
```bash
# monorepo
mkdir blurt && cd blurt && pnpm init
# mobile app
pnpm create expo-app apps/mobile --template tabs
# api
pnpm dlx @nestjs/cli new apps/api --package-manager pnpm
# teacher dashboard
pnpm create next-app apps/dashboard --ts --tailwind --app
# then copy AGENTS.md, docs/ and assets/ into the repo root
```
Check each library's docs for current install steps. Versions move quickly, and Expo has its own `npx expo install` for native packages.

## Cheaper MVP path
If you're solo and want to ship a first version fast: skip NestJS and Redis, and use **Supabase only** (Postgres + Auth + Storage + Edge Functions for answer checking and XP). The dashboard still talks to Supabase directly in that setup, with row-level security policies doing the teacher/student permission checks. Move to the full stack above when you add leagues, reports and heavier logic. Keep the matcher in `packages/shared` so it moves with you.

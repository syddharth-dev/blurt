# CLAUDE.md

Project rules for Claude Code. The main rules live in AGENTS.md and are imported here:

@AGENTS.md

## Where to look before coding
Read the doc that matches the task before writing code:

- Any UI (app or dashboard) → @docs/BRAND.md
- Student app screens and states → docs/SCREENS.md
- Pip the mascot → docs/MASCOT.md
- Teacher dashboard → docs/TEACHER_DASHBOARD.md
- Database, Prisma, API routes → docs/DATA_AND_API.md
- Folder structure, patterns, state machine → docs/ARCHITECTURE.md
- Speech recognition, answer checking → docs/SPEECH_AND_MATCHING.md
- Hosting, environment variables → docs/DEPLOYMENT.md
- What to build next → docs/ROADMAP.md

## How to work in this repo
- Work on one feature or screen at a time. Before a big change, summarise the plan and wait for approval.
- If a request conflicts with the docs, say so and ask, rather than silently picking one.
- When a decision changes, update the relevant doc in the same change as the code.
- Run typecheck, lint and tests for the package you touched before saying a task is done.

## Commands
Monorepo: pnpm workspaces + Turborepo. `apps/mobile`, `apps/api`, `apps/dashboard`, `packages/shared` (`@blurt/shared`).
- Install: `pnpm install` (also generates the Prisma client)
- Mobile app: `pnpm --filter mobile start` (needs a development build once native modules are used; see apps/mobile/AGENTS.md)
- Dashboard: `pnpm --filter dashboard dev` → http://localhost:3001
- API: `pnpm --filter api start:dev` → http://localhost:3000/health
- Tests: `pnpm test` · API e2e: `pnpm test:e2e` · Typecheck: `pnpm typecheck` · Lint: `pnpm lint` · Format: `pnpm format`
- One package: `pnpm --filter <mobile|api|dashboard|@blurt/shared> <script>`
- Mobile native packages: `cd apps/mobile && npx expo install <pkg>` (never `pnpm add`)
- After changing tokens in `packages/shared/src/theme`: `pnpm --filter dashboard gen:tokens`
- Prisma: `pnpm --filter api prisma:validate` · `pnpm --filter api db:migrate` (needs `DIRECT_URL`) · `pnpm --filter api db:seed` (starter library, safe to rerun) · `pnpm --filter api make-admin you@example.com` (first admin)
- Env: copy each app's `.env.example` to `.env` (API) or `.env.local` (mobile, dashboard)

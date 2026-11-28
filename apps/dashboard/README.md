# Blurt! teacher dashboard

Next.js (App Router) + Tailwind v4. Spec: the repo's `docs/TEACHER_DASHBOARD.md` and `docs/BRAND.md`.

```bash
cp .env.example .env.local
pnpm --filter dashboard dev     # http://localhost:3001
pnpm --filter dashboard gen:tokens   # after changing tokens in packages/shared
```

Sign in with an invited teacher or admin account (email + code). The first admin is made with
`pnpm --filter api make-admin you@example.com`; the API must be running (`pnpm --filter api start:dev`).

Brand tokens come from `@blurt/shared/theme` and are generated into `src/styles/tokens.css`.
Tailwind's default palette is removed, so only brand colours (`bg-violet`, `text-night`, …) exist.

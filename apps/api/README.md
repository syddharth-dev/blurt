# Blurt! API

NestJS modular monolith. See the repo's `docs/ARCHITECTURE.md`, `docs/DATA_AND_API.md` and `docs/DEPLOYMENT.md`.

```bash
cp .env.example .env          # fill in Supabase values
pnpm --filter api start:dev   # http://localhost:3000/health
pnpm --filter api test        # unit tests
pnpm --filter api test:e2e    # e2e tests
pnpm --filter api db:migrate  # create/apply a migration (needs DIRECT_URL)
```

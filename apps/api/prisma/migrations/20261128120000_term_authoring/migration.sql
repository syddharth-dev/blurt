-- Terms can be saved before the part to name is marked (Phase 4 step 2).
ALTER TABLE "Term" ALTER COLUMN "highlight" DROP NOT NULL;

-- Rounds keep a snapshot of the terms they served, so a teacher's edit mid-round
-- doesn't change a round in progress (TEACHER_DASHBOARD.md → versions).
ALTER TABLE "Round" ADD COLUMN "terms" JSONB;

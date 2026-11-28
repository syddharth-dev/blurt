-- Spaced repetition (Phase 5 step 2): each term a student has played sits in a review box.
ALTER TABLE "TermMastery" ADD COLUMN "box" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TermMastery" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- Terms already answered right start in box 1 (due in a day); the rest stay in box 0 (due now).
UPDATE "TermMastery" SET "box" = 1, "dueAt" = NOW() + INTERVAL '1 day' WHERE "correct" > 0 AND "missed" = 0;

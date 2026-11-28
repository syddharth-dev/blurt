-- Daily challenge (Phase 5 step 3): the bonus is earned once per local day.
ALTER TABLE "User" ADD COLUMN "lastDailyOn" TEXT;
ALTER TABLE "Round" ADD COLUMN "daily" BOOLEAN NOT NULL DEFAULT false;

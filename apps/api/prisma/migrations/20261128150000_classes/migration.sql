-- Classes before schools exist (Phase 4 step 5): the school is optional.
ALTER TABLE "Class" ALTER COLUMN "schoolId" DROP NOT NULL;
ALTER TABLE "Class" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

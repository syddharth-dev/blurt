-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- DropForeignKey
ALTER TABLE "Term" DROP CONSTRAINT "Term_pictureId_fkey";

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "response" JSONB,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Picture" ADD COLUMN     "diagram" TEXT,
ALTER COLUMN "storageKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "bestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hintsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lives" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "skipsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "RoundStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "summary" JSONB,
ADD COLUMN     "termIds" TEXT[],
ALTER COLUMN "topicId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Term" ALTER COLUMN "pictureId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "lastPlayedOn" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_pictureId_fkey" FOREIGN KEY ("pictureId") REFERENCES "Picture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

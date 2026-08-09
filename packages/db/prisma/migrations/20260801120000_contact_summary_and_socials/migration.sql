-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summarySourceUrl" TEXT,
ADD COLUMN     "summaryUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "twitterUrl" TEXT;

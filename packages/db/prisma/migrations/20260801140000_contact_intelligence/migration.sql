-- CreateEnum
CREATE TYPE "FactBand" AS ENUM ('VERIFIED', 'PROBABLE', 'POSSIBLE');

-- CreateEnum
CREATE TYPE "FactStatus" AS ENUM ('APPLIED', 'PROPOSED', 'DISMISSED', 'SUPERSEDED');

-- AlterTable
--
-- The summary columns are dropped at the bottom of this file, after their
-- contents have been copied into "contactBrief". Dropping them here, where
-- Prisma put them, would destroy every summary the agent has already written.
ALTER TABLE "contact"
ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "enrichmentError" TEXT,
ADD COLUMN     "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "contactFact" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "band" "FactBand" NOT NULL,
    "evidence" JSONB NOT NULL,
    "method" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sessionId" TEXT,
    "status" "FactStatus" NOT NULL DEFAULT 'PROPOSED',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "contactFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactBrief" (
    "contactId" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "sourceUrl" TEXT,
    "sessionId" TEXT,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactBrief_pkey" PRIMARY KEY ("contactId")
);

-- CreateTable
CREATE TABLE "agentTask" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "budget" INTEGER NOT NULL DEFAULT 4,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "leasedUntil" TIMESTAMP(3),
    "sessionId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agentEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "emittedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contactFact_contactId_field_status_idx" ON "contactFact"("contactId", "field", "status");

-- CreateIndex
CREATE INDEX "contactFact_status_observedAt_idx" ON "contactFact"("status", "observedAt");

-- CreateIndex
CREATE INDEX "agentTask_dueAt_leasedUntil_idx" ON "agentTask"("dueAt", "leasedUntil");

-- CreateIndex
CREATE INDEX "agentTask_contactId_idx" ON "agentTask"("contactId");

-- CreateIndex
CREATE INDEX "agentEvent_sessionId_emittedAt_idx" ON "agentEvent"("sessionId", "emittedAt");

-- CreateIndex
CREATE INDEX "agentEvent_contactId_emittedAt_idx" ON "agentEvent"("contactId", "emittedAt");

-- AddForeignKey
ALTER TABLE "contactFact" ADD CONSTRAINT "contactFact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactFact" ADD CONSTRAINT "contactFact_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactBrief" ADD CONSTRAINT "contactBrief_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry existing summaries over.
--
-- They were written by a tool that already demanded a source URL, so they are
-- exactly what a brief is; they simply had nowhere structured to live. Scored
-- 0.85 — the bottom of VERIFIED — because they were auto-applied under the old
-- all-or-nothing rule, and re-deriving a real score needs the evidence that
-- rule never recorded. The next refresh replaces this with a scored one.
INSERT INTO "contactBrief" ("contactId", "narrative", "sections", "score", "sourceUrl", "refreshedAt")
SELECT
    "id",
    "summary",
    '{}'::jsonb,
    0.85,
    "summarySourceUrl",
    COALESCE("summaryUpdatedAt", CURRENT_TIMESTAMP)
FROM "contact"
WHERE "summary" IS NOT NULL;

-- Everything already in the CRM predates this pipeline, so nothing is queued
-- for it. Leaving them PENDING would have the sheet poll forever for work that
-- was never scheduled; the dispatcher picks them up on its own cadence.
UPDATE "contact" SET "enrichmentStatus" = 'COMPLETE', "enrichedAt" = "updatedAt";

-- DropColumn
ALTER TABLE "contact" DROP COLUMN "summary",
DROP COLUMN "summarySourceUrl",
DROP COLUMN "summaryUpdatedAt";


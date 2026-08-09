-- AlterTable
ALTER TABLE "company" ADD COLUMN     "lastActivityAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "lastActivityAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "deal" ADD COLUMN     "lastActivityAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "company_lastActivityAt_idx" ON "company"("lastActivityAt");

-- CreateIndex
CREATE INDEX "contact_lastActivityAt_idx" ON "contact"("lastActivityAt");

-- CreateIndex
CREATE INDEX "deal_lastActivityAt_idx" ON "deal"("lastActivityAt");


-- Backfill from what is already there, so the new column is sortable on day one
-- rather than after everyone's next activity. `createdAt` (not `occurredAt`) to
-- match what the lateral join this replaces was reading.
UPDATE "company" c SET "lastActivityAt" = a.max
FROM (SELECT "companyId" AS id, MAX("createdAt") AS max FROM "activity" WHERE "companyId" IS NOT NULL GROUP BY "companyId") a
WHERE c.id = a.id;

UPDATE "contact" ct SET "lastActivityAt" = a.max
FROM (SELECT "contactId" AS id, MAX("createdAt") AS max FROM "activity" WHERE "contactId" IS NOT NULL GROUP BY "contactId") a
WHERE ct.id = a.id;

UPDATE "deal" d SET "lastActivityAt" = a.max
FROM (SELECT "dealId" AS id, MAX("createdAt") AS max FROM "activity" WHERE "dealId" IS NOT NULL GROUP BY "dealId") a
WHERE d.id = a.id;

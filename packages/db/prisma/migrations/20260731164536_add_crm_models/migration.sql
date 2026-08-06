-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('DEMO_BOOKED', 'QUALIFIED_TO_BUY', 'UNQUALIFIED_TO_BUY', 'DECISION_MAKER_BOUGHT_IN', 'CONTRACT_SENT', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK', 'STAGE_CHANGE', 'ENRICHMENT');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "website" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "logoDarkUrl" TEXT,
    "iconUrl" TEXT,
    "brandColor" TEXT,
    "industry" TEXT,
    "subIndustry" TEXT,
    "city" TEXT,
    "stateCode" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "twitterUrl" TEXT,
    "githubUrl" TEXT,
    "pricingUrl" TEXT,
    "careersUrl" TEXT,
    "ownerId" TEXT,
    "primaryContactId" TEXT,
    "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'PENDING',
    "enrichedAt" TIMESTAMP(3),
    "enrichmentError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companyEnrichment" (
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'context.dev',
    "raw" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companyEnrichment_pkey" PRIMARY KEY ("companyId")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "linkedinUrl" TEXT,
    "companyId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'DEMO_BOOKED',
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "expectedCloseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealContact" (
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "dealContact_pkey" PRIMARY KEY ("dealId","contactId")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "companyId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "createdById" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_domain_key" ON "company"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "company_primaryContactId_key" ON "company"("primaryContactId");

-- CreateIndex
CREATE INDEX "company_ownerId_idx" ON "company"("ownerId");

-- CreateIndex
CREATE INDEX "company_name_idx" ON "company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "contact_email_key" ON "contact"("email");

-- CreateIndex
CREATE INDEX "contact_companyId_idx" ON "contact"("companyId");

-- CreateIndex
CREATE INDEX "contact_ownerId_idx" ON "contact"("ownerId");

-- CreateIndex
CREATE INDEX "deal_companyId_idx" ON "deal"("companyId");

-- CreateIndex
CREATE INDEX "deal_ownerId_idx" ON "deal"("ownerId");

-- CreateIndex
CREATE INDEX "deal_stage_idx" ON "deal"("stage");

-- CreateIndex
CREATE INDEX "deal_expectedCloseDate_idx" ON "deal"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "dealContact_contactId_idx" ON "dealContact"("contactId");

-- CreateIndex
CREATE INDEX "activity_companyId_createdAt_idx" ON "activity"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_dealId_createdAt_idx" ON "activity"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_contactId_createdAt_idx" ON "activity"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_dueAt_idx" ON "activity"("dueAt");

-- CreateIndex
CREATE INDEX "activity_createdById_idx" ON "activity"("createdById");

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companyEnrichment" ADD CONSTRAINT "companyEnrichment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealContact" ADD CONSTRAINT "dealContact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealContact" ADD CONSTRAINT "dealContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

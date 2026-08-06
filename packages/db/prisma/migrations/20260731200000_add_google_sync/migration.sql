-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('MANUAL', 'IMPORT', 'EMAIL', 'CALENDAR');

-- CreateEnum
CREATE TYPE "GoogleSyncStatus" AS ENUM ('IDLE', 'BACKFILLING', 'RUNNING', 'NEEDS_RECONNECT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "activity" ADD COLUMN     "calendarEventId" TEXT,
ADD COLUMN     "emailThreadId" TEXT;

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "source" "RecordSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "source" "RecordSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "mailboxSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "GoogleSyncStatus" NOT NULL DEFAULT 'IDLE',
    "cursor" TEXT,
    "backfilledTo" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "retryAfter" TIMESTAMP(3),
    "autoCreate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailboxSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emailThread" (
    "id" TEXT NOT NULL,
    "rootMessageId" TEXT NOT NULL,
    "subject" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "firstMessageAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "rfcMessageId" TEXT NOT NULL,
    "syncedByUserId" TEXT,
    "gmailMessageId" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "recipients" JSONB NOT NULL,
    "subject" TEXT,
    "snippet" TEXT,
    "body" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendarEvent" (
    "id" TEXT NOT NULL,
    "iCalUid" TEXT NOT NULL,
    "originalStartTime" TIMESTAMP(3) NOT NULL,
    "recurringEventId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "location" TEXT,
    "conferenceUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "organizerEmail" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "syncedByUserId" TEXT,
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendarAttendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "responseStatus" TEXT,
    "isOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "contactId" TEXT,

    CONSTRAINT "calendarAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppressedDomain" (
    "domain" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppressedDomain_pkey" PRIMARY KEY ("domain")
);

-- CreateIndex
CREATE INDEX "mailboxSync_status_idx" ON "mailboxSync"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mailboxSync_userId_source_key" ON "mailboxSync"("userId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "emailThread_rootMessageId_key" ON "emailThread"("rootMessageId");

-- CreateIndex
CREATE INDEX "emailThread_companyId_lastMessageAt_idx" ON "emailThread"("companyId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "emailThread_contactId_lastMessageAt_idx" ON "emailThread"("contactId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "emailMessage_rfcMessageId_key" ON "emailMessage"("rfcMessageId");

-- CreateIndex
CREATE INDEX "emailMessage_threadId_sentAt_idx" ON "emailMessage"("threadId", "sentAt");

-- CreateIndex
CREATE INDEX "calendarEvent_companyId_startsAt_idx" ON "calendarEvent"("companyId", "startsAt");

-- CreateIndex
CREATE INDEX "calendarEvent_contactId_startsAt_idx" ON "calendarEvent"("contactId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "calendarEvent_iCalUid_originalStartTime_key" ON "calendarEvent"("iCalUid", "originalStartTime");

-- CreateIndex
CREATE INDEX "calendarAttendee_contactId_idx" ON "calendarAttendee"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "calendarAttendee_eventId_email_key" ON "calendarAttendee"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "activity_emailThreadId_key" ON "activity"("emailThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_calendarEventId_key" ON "activity"("calendarEventId");

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_emailThreadId_fkey" FOREIGN KEY ("emailThreadId") REFERENCES "emailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailboxSync" ADD CONSTRAINT "mailboxSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emailThread" ADD CONSTRAINT "emailThread_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emailThread" ADD CONSTRAINT "emailThread_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emailMessage" ADD CONSTRAINT "emailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "emailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendarEvent" ADD CONSTRAINT "calendarEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendarEvent" ADD CONSTRAINT "calendarEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendarAttendee" ADD CONSTRAINT "calendarAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendarAttendee" ADD CONSTRAINT "calendarAttendee_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;


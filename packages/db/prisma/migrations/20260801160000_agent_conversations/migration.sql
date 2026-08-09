-- CreateTable
CREATE TABLE "agentConversation" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "continuationToken" TEXT,
    "streamIndex" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agentConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agentConversation_sessionId_key" ON "agentConversation"("sessionId");

-- CreateIndex
CREATE INDEX "agentConversation_contactId_lastMessageAt_idx" ON "agentConversation"("contactId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "agentConversation_companyId_lastMessageAt_idx" ON "agentConversation"("companyId", "lastMessageAt");

-- AddForeignKey
ALTER TABLE "agentConversation" ADD CONSTRAINT "agentConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agentConversation" ADD CONSTRAINT "agentConversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agentConversation" ADD CONSTRAINT "agentConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


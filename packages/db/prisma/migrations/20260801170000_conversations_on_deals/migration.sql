-- AlterTable
ALTER TABLE "agentConversation" ADD COLUMN     "dealId" TEXT;

-- CreateIndex
CREATE INDEX "agentConversation_dealId_lastMessageAt_idx" ON "agentConversation"("dealId", "lastMessageAt");

-- AddForeignKey
ALTER TABLE "agentConversation" ADD CONSTRAINT "agentConversation_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;


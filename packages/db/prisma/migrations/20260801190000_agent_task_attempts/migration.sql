-- Bounded retries for the agent's work queue.
--
-- `leasedUntil` alone cannot distinguish a run that died (retry it) from one
-- that can never finish (stop). Rows in the second case were re-leased every
-- ten minutes indefinitely, resuming the same durable session and paying for a
-- model turn on each pass.
ALTER TABLE "agentTask" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Existing open rows have already been dispatched at least once; several have
-- been dispatched many times. Seed them at 1 rather than 0 so the cap counts
-- from roughly where they actually are instead of granting a fresh allowance.
UPDATE "agentTask" SET "attempts" = 1 WHERE "startedAt" IS NOT NULL AND "finishedAt" IS NULL;

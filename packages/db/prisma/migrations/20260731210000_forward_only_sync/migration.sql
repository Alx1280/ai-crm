-- Sync is forward-only now, so there is no backfill for a row to be in the
-- middle of. Anything mid-import becomes IDLE and carries on from wherever its
-- cursor already points.
UPDATE "mailboxSync" SET "status" = 'IDLE' WHERE "status" = 'BACKFILLING';

-- AlterEnum
BEGIN;
CREATE TYPE "GoogleSyncStatus_new" AS ENUM ('IDLE', 'RUNNING', 'NEEDS_RECONNECT', 'FAILED');
ALTER TABLE "public"."mailboxSync" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mailboxSync" ALTER COLUMN "status" TYPE "GoogleSyncStatus_new" USING ("status"::text::"GoogleSyncStatus_new");
ALTER TYPE "GoogleSyncStatus" RENAME TO "GoogleSyncStatus_old";
ALTER TYPE "GoogleSyncStatus_new" RENAME TO "GoogleSyncStatus";
DROP TYPE "public"."GoogleSyncStatus_old";
ALTER TABLE "mailboxSync" ALTER COLUMN "status" SET DEFAULT 'IDLE';
COMMIT;

-- AlterTable
ALTER TABLE "mailboxSync" DROP COLUMN "backfilledTo";


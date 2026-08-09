-- The `organization` Better Auth plugin has been removed: this is a
-- single-tenant internal app, so memberships and invitations no longer exist.

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT IF EXISTS "member_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT IF EXISTS "member_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "invitation";

-- DropTable
DROP TABLE IF EXISTS "member";

-- DropTable
DROP TABLE IF EXISTS "organization";

-- AlterTable
ALTER TABLE "session" DROP COLUMN IF EXISTS "activeOrganizationId";

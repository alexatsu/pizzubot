-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('Custom');

-- AlterTable
ALTER TABLE "roles_table" ADD COLUMN     "roleType" "RoleType" NOT NULL DEFAULT 'Custom';

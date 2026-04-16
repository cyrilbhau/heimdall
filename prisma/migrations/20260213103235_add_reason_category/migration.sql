-- CreateEnum
CREATE TYPE "ReasonCategory" AS ENUM ('EVENT', 'VISIT', 'OTHER');

-- AlterTable
ALTER TABLE "VisitReason" ADD COLUMN     "category" "ReasonCategory";

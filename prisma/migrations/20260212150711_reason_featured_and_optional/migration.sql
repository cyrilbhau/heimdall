-- DropForeignKey
ALTER TABLE "Visit" DROP CONSTRAINT "Visit_visitReasonId_fkey";

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "customReason" TEXT,
ALTER COLUMN "visitReasonId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VisitReason" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_visitReasonId_fkey" FOREIGN KEY ("visitReasonId") REFERENCES "VisitReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

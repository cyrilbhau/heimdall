-- DropForeignKey
ALTER TABLE "CrmSyncEvent" DROP CONSTRAINT "CrmSyncEvent_visitId_fkey";

-- CreateIndex
CREATE INDEX "CrmSyncEvent_visitId_idx" ON "CrmSyncEvent"("visitId");

-- CreateIndex
CREATE INDEX "Visit_visitReasonId_idx" ON "Visit"("visitReasonId");

-- CreateIndex
CREATE INDEX "Visit_createdAt_idx" ON "Visit"("createdAt");

-- CreateIndex
CREATE INDEX "Visit_email_idx" ON "Visit"("email");

-- CreateIndex
CREATE INDEX "Visit_fullName_idx" ON "Visit"("fullName");

-- AddForeignKey
ALTER TABLE "CrmSyncEvent" ADD CONSTRAINT "CrmSyncEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

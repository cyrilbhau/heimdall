-- CreateEnum
CREATE TYPE "VisitSource" AS ENUM ('KIOSK', 'MANUAL', 'API');

-- CreateEnum
CREATE TYPE "ReasonSource" AS ENUM ('MANUAL', 'LUMA');

-- CreateTable
CREATE TABLE "VisitReason" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" "ReasonSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "photoUrl" TEXT,
    "visitReasonId" TEXT NOT NULL,
    "notes" TEXT,
    "source" "VisitSource" NOT NULL DEFAULT 'KIOSK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmSyncEvent" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LumaEvent" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LumaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitReason_label_key" ON "VisitReason"("label");

-- CreateIndex
CREATE UNIQUE INDEX "VisitReason_slug_key" ON "VisitReason"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LumaEvent_externalId_key" ON "LumaEvent"("externalId");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_visitReasonId_fkey" FOREIGN KEY ("visitReasonId") REFERENCES "VisitReason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSyncEvent" ADD CONSTRAINT "CrmSyncEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

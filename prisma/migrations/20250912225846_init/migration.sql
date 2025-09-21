-- CreateTable
CREATE TABLE "public"."MessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommunicationLog" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "recipientId" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientName" TEXT,
    "messageType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "batchId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageTemplate_type_idx" ON "public"."MessageTemplate"("type");

-- CreateIndex
CREATE INDEX "MessageTemplate_category_idx" ON "public"."MessageTemplate"("category");

-- CreateIndex
CREATE INDEX "MessageTemplate_isActive_idx" ON "public"."MessageTemplate"("isActive");

-- CreateIndex
CREATE INDEX "CommunicationLog_recipientId_idx" ON "public"."CommunicationLog"("recipientId");

-- CreateIndex
CREATE INDEX "CommunicationLog_status_idx" ON "public"."CommunicationLog"("status");

-- CreateIndex
CREATE INDEX "CommunicationLog_batchId_idx" ON "public"."CommunicationLog"("batchId");

-- CreateIndex
CREATE INDEX "CommunicationLog_createdAt_idx" ON "public"."CommunicationLog"("createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_messageType_idx" ON "public"."CommunicationLog"("messageType");

-- CreateIndex
CREATE INDEX "CommunicationLog_category_idx" ON "public"."CommunicationLog"("category");

-- AddForeignKey
ALTER TABLE "public"."CommunicationLog" ADD CONSTRAINT "CommunicationLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

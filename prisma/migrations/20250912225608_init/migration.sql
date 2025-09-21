-- CreateTable
CREATE TABLE "public"."Participant" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "idNumber" TEXT NOT NULL,
    "bloodType" TEXT,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "category" TEXT NOT NULL,
    "bibName" TEXT NOT NULL,
    "jerseySize" TEXT NOT NULL,
    "estimatedTime" TEXT,
    "emergencyName" TEXT NOT NULL,
    "emergencyPhone" TEXT NOT NULL,
    "emergencyRelation" TEXT NOT NULL,
    "medicalHistory" TEXT,
    "allergies" TEXT,
    "medications" TEXT,
    "registrationCode" TEXT NOT NULL,
    "bibNumber" TEXT,
    "registrationType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "basePrice" INTEGER NOT NULL,
    "jerseyAddOn" INTEGER NOT NULL DEFAULT 0,
    "totalPrice" INTEGER NOT NULL,
    "isEarlyBird" BOOLEAN NOT NULL DEFAULT false,
    "registrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommunityRegistration" (
    "id" TEXT NOT NULL,
    "communityName" TEXT NOT NULL,
    "communityType" TEXT NOT NULL,
    "communityAddress" TEXT NOT NULL,
    "picName" TEXT NOT NULL,
    "picWhatsapp" TEXT NOT NULL,
    "picEmail" TEXT NOT NULL,
    "picPosition" TEXT,
    "registrationCode" TEXT NOT NULL,
    "totalMembers" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "totalBasePrice" INTEGER NOT NULL,
    "promoAmount" INTEGER NOT NULL DEFAULT 0,
    "jerseyAddOn" INTEGER NOT NULL DEFAULT 0,
    "finalPrice" INTEGER NOT NULL,
    "appliedPromo" TEXT,
    "registrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommunityMember" (
    "id" TEXT NOT NULL,
    "communityRegistrationId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "memberNumber" INTEGER NOT NULL,
    "isFreeMember" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "paymentCode" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "paymentChannel" TEXT,
    "midtransOrderId" TEXT,
    "midtransToken" TEXT,
    "midtransResponse" JSONB,
    "vaNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "participantId" TEXT,
    "communityRegistrationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RacePack" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "isCollected" BOOLEAN NOT NULL DEFAULT false,
    "collectedAt" TIMESTAMP(3),
    "collectedBy" TEXT,
    "collectorName" TEXT,
    "collectorPhone" TEXT,
    "hasJersey" BOOLEAN NOT NULL DEFAULT true,
    "hasBib" BOOLEAN NOT NULL DEFAULT true,
    "hasMedal" BOOLEAN NOT NULL DEFAULT false,
    "hasGoodieBag" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RacePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CheckIn" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "checkPoint" TEXT NOT NULL,
    "checkTime" TIMESTAMP(3) NOT NULL,
    "chipTime" TEXT,
    "gunTime" TEXT,
    "verifiedBy" TEXT,
    "verificationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Certificate" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "finishTime" TEXT,
    "rank" INTEGER,
    "categoryRank" INTEGER,
    "fileUrl" TEXT,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "participantId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response" JSONB,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."registration_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "attempt_data" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "public"."Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_registrationCode_key" ON "public"."Participant"("registrationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_bibNumber_key" ON "public"."Participant"("bibNumber");

-- CreateIndex
CREATE INDEX "Participant_email_idx" ON "public"."Participant"("email");

-- CreateIndex
CREATE INDEX "Participant_registrationCode_idx" ON "public"."Participant"("registrationCode");

-- CreateIndex
CREATE INDEX "Participant_bibNumber_idx" ON "public"."Participant"("bibNumber");

-- CreateIndex
CREATE INDEX "Participant_category_idx" ON "public"."Participant"("category");

-- CreateIndex
CREATE INDEX "Participant_registrationStatus_idx" ON "public"."Participant"("registrationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityRegistration_registrationCode_key" ON "public"."CommunityRegistration"("registrationCode");

-- CreateIndex
CREATE INDEX "CommunityRegistration_registrationCode_idx" ON "public"."CommunityRegistration"("registrationCode");

-- CreateIndex
CREATE INDEX "CommunityRegistration_communityName_idx" ON "public"."CommunityRegistration"("communityName");

-- CreateIndex
CREATE INDEX "CommunityRegistration_picEmail_idx" ON "public"."CommunityRegistration"("picEmail");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_participantId_key" ON "public"."CommunityMember"("participantId");

-- CreateIndex
CREATE INDEX "CommunityMember_communityRegistrationId_idx" ON "public"."CommunityMember"("communityRegistrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentCode_key" ON "public"."Payment"("paymentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_midtransOrderId_key" ON "public"."Payment"("midtransOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_midtransToken_key" ON "public"."Payment"("midtransToken");

-- CreateIndex
CREATE INDEX "Payment_paymentCode_idx" ON "public"."Payment"("paymentCode");

-- CreateIndex
CREATE INDEX "Payment_midtransOrderId_idx" ON "public"."Payment"("midtransOrderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_participantId_idx" ON "public"."Payment"("participantId");

-- CreateIndex
CREATE INDEX "Payment_communityRegistrationId_idx" ON "public"."Payment"("communityRegistrationId");

-- CreateIndex
CREATE UNIQUE INDEX "RacePack_participantId_key" ON "public"."RacePack"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "RacePack_qrCode_key" ON "public"."RacePack"("qrCode");

-- CreateIndex
CREATE INDEX "RacePack_qrCode_idx" ON "public"."RacePack"("qrCode");

-- CreateIndex
CREATE INDEX "RacePack_isCollected_idx" ON "public"."RacePack"("isCollected");

-- CreateIndex
CREATE INDEX "CheckIn_participantId_idx" ON "public"."CheckIn"("participantId");

-- CreateIndex
CREATE INDEX "CheckIn_checkPoint_idx" ON "public"."CheckIn"("checkPoint");

-- CreateIndex
CREATE INDEX "CheckIn_checkTime_idx" ON "public"."CheckIn"("checkTime");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_participantId_checkPoint_key" ON "public"."CheckIn"("participantId", "checkPoint");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_participantId_key" ON "public"."Certificate"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "public"."Certificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "Certificate_certificateNumber_idx" ON "public"."Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "public"."Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "public"."Admin"("email");

-- CreateIndex
CREATE INDEX "AdminLog_adminId_idx" ON "public"."AdminLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminLog_action_idx" ON "public"."AdminLog"("action");

-- CreateIndex
CREATE INDEX "AdminLog_createdAt_idx" ON "public"."AdminLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "public"."Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "public"."Setting"("key");

-- CreateIndex
CREATE INDEX "Notification_participantId_idx" ON "public"."Notification"("participantId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "public"."Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "public"."idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "public"."idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_key_status_idx" ON "public"."idempotency_keys"("key", "status");

-- CreateIndex
CREATE INDEX "registration_attempts_email_created_at_idx" ON "public"."registration_attempts"("email", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "public"."CommunityMember" ADD CONSTRAINT "CommunityMember_communityRegistrationId_fkey" FOREIGN KEY ("communityRegistrationId") REFERENCES "public"."CommunityRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityMember" ADD CONSTRAINT "CommunityMember_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_communityRegistrationId_fkey" FOREIGN KEY ("communityRegistrationId") REFERENCES "public"."CommunityRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RacePack" ADD CONSTRAINT "RacePack_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CheckIn" ADD CONSTRAINT "CheckIn_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Certificate" ADD CONSTRAINT "Certificate_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

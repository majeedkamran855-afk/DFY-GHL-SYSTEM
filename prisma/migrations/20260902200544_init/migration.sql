-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ACQUISITIONS_MANAGER', 'LEAD_MANAGER', 'DISPO_MANAGER', 'COLD_CALLER', 'TC');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('SINGLE_FAMILY', 'MULTI_FAMILY_2_4', 'MULTI_FAMILY_5_PLUS', 'CONDO', 'TOWNHOME', 'MOBILE_MANUFACTURED', 'LAND', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "DistressTag" AS ENUM ('PRE_FORECLOSURE', 'TAX_LIEN', 'TAX_DELINQUENT', 'PROBATE', 'VACANT', 'ABSENTEE_OWNER', 'CODE_VIOLATION', 'BANKRUPTCY', 'DIVORCE', 'EVICTION', 'INHERITED', 'HIGH_EQUITY', 'LOW_EQUITY_UNDERWATER', 'EXPIRED_LISTING', 'FSBO', 'TIRED_LANDLORD');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('NEW_LEAD', 'COLD_CONTACTED', 'SELLER_LEAD', 'APPOINTMENT_SET', 'OFFER_MADE', 'UNDER_CONTRACT', 'DISPO_ACTIVE', 'BUYER_UNDER_CONTRACT', 'CLOSING', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PRESENTED', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PURCHASE_AND_SALE', 'ASSIGNMENT_CONTRACT', 'ADDENDUM', 'DOUBLE_CLOSE_PACKAGE', 'NOVATION_AGREEMENT', 'SUBJECT_TO_ADDENDUM');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFTED', 'SENT_FOR_SIGNATURE', 'PARTIALLY_SIGNED', 'FULLY_EXECUTED', 'VOIDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "POFStatus" AS ENUM ('NOT_PROVIDED', 'SUBMITTED', 'VERIFIED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetZipCodes" TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phoneExtension" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "apn" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "county" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "propertyType" "PropertyType" NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(65,30),
    "squareFootage" INTEGER,
    "lotSizeSqft" INTEGER,
    "yearBuilt" INTEGER,
    "estimatedValue" DECIMAL(65,30),
    "estimatedValueSource" TEXT,
    "mortgageBalanceEst" DECIMAL(65,30),
    "equityPercentEst" DECIMAL(65,30),
    "distressTags" "DistressTag"[],
    "vacant" BOOLEAN NOT NULL DEFAULT false,
    "absenteeOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "ownershipType" TEXT,
    "isCurrentOwner" BOOLEAN NOT NULL DEFAULT true,
    "ownershipStart" TIMESTAMP(3),
    "ownershipEnd" TIMESTAMP(3),

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MortgageRecord" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "lenderName" TEXT,
    "originalAmount" DECIMAL(65,30),
    "originationDate" TIMESTAMP(3),
    "estimatedBalance" DECIMAL(65,30),
    "loanType" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MortgageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "entityName" TEXT,
    "mailingAddress1" TEXT,
    "mailingCity" TEXT,
    "mailingState" TEXT,
    "mailingZip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactPhone" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "phoneType" TEXT,
    "isDNC" BOOLEAN NOT NULL DEFAULT false,
    "dncCheckedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" INTEGER,

    CONSTRAINT "ContactPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactEmail" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContactEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkipTraceRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "contactId" TEXT,
    "provider" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "matchCount" INTEGER NOT NULL,
    "costCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkipTraceRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "primaryContactId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "stage" "DealStage" NOT NULL DEFAULT 'NEW_LEAD',
    "leadSource" TEXT,
    "motivation" TEXT,
    "askingPrice" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "lostReason" TEXT,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealStageHistory" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStage" "DealStage",
    "toStage" "DealStage" NOT NULL,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "arv" DECIMAL(65,30) NOT NULL,
    "repairEstimate" DECIMAL(65,30) NOT NULL,
    "wholesaleFeeTarget" DECIMAL(65,30) NOT NULL,
    "maoFormula" TEXT NOT NULL DEFAULT 'ARV_70',
    "maxAllowableOffer" DECIMAL(65,30) NOT NULL,
    "offerAmount" DECIMAL(65,30) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "presentedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "purchasePrice" DECIMAL(65,30),
    "assignmentFee" DECIMAL(65,30),
    "emdAmount" DECIMAL(65,30),
    "emdDueDate" TIMESTAMP(3),
    "emdReceivedAt" TIMESTAMP(3),
    "inspectionPeriodEnds" TIMESTAMP(3),
    "closingDate" TIMESTAMP(3),
    "earnestMoneyHolder" TEXT,
    "titleCompanyName" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFTED',
    "docSignEnvelopeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyName" TEXT,
    "buyBoxZips" TEXT[],
    "buyBoxPropertyTypes" "PropertyType"[],
    "minBudget" DECIMAL(65,30),
    "maxBudget" DECIMAL(65,30),
    "minBeds" INTEGER,
    "strategy" TEXT[],
    "pofStatus" "POFStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "pofDocumentUrl" TEXT,
    "pofExpiresAt" TIMESTAMP(3),
    "vipTier" BOOLEAN NOT NULL DEFAULT false,
    "dealsClosedCount" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerAssignment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "offerToBuyerAmount" DECIMAL(65,30) NOT NULL,
    "assignmentFeeAmount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "emdReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparableSale" (
    "id" TEXT NOT NULL,
    "subjectPropertyId" TEXT NOT NULL,
    "compAddress" TEXT NOT NULL,
    "compLatitude" DOUBLE PRECISION NOT NULL,
    "compLongitude" DOUBLE PRECISION NOT NULL,
    "distanceMiles" DECIMAL(65,30) NOT NULL,
    "soldPrice" DECIMAL(65,30) NOT NULL,
    "soldDate" TIMESTAMP(3) NOT NULL,
    "squareFootage" INTEGER NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(65,30),
    "yearBuilt" INTEGER,
    "daysOnMarket" INTEGER,
    "source" TEXT NOT NULL,
    "similarityScore" DECIMAL(65,30),
    "includedInAvm" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComparableSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneNumber" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "e164" TEXT NOT NULL,
    "areaCode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "campaignId" TEXT,
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign10DLC" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tcrBrandId" TEXT NOT NULL,
    "tcrCampaignId" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "throughputTier" INTEGER NOT NULL,

    CONSTRAINT "Campaign10DLC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "dealId" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "durationSec" INTEGER,
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Property_organizationId_zip_idx" ON "Property"("organizationId", "zip");

-- CreateIndex
CREATE INDEX "Property_organizationId_apn_idx" ON "Property"("organizationId", "apn");

-- CreateIndex
CREATE UNIQUE INDEX "Property_organizationId_apn_zip_key" ON "Property"("organizationId", "apn", "zip");

-- CreateIndex
CREATE INDEX "PropertyOwner_propertyId_idx" ON "PropertyOwner"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyOwner_contactId_idx" ON "PropertyOwner"("contactId");

-- CreateIndex
CREATE INDEX "Contact_organizationId_lastName_idx" ON "Contact"("organizationId", "lastName");

-- CreateIndex
CREATE INDEX "ContactPhone_phoneNumber_idx" ON "ContactPhone"("phoneNumber");

-- CreateIndex
CREATE INDEX "Deal_organizationId_stage_idx" ON "Deal"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "Buyer_organizationId_vipTier_idx" ON "Buyer"("organizationId", "vipTier");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_e164_key" ON "PhoneNumber"("e164");

-- CreateIndex
CREATE INDEX "Activity_organizationId_createdAt_idx" ON "Activity"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortgageRecord" ADD CONSTRAINT "MortgageRecord_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPhone" ADD CONSTRAINT "ContactPhone_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactEmail" ADD CONSTRAINT "ContactEmail_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkipTraceRun" ADD CONSTRAINT "SkipTraceRun_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkipTraceRun" ADD CONSTRAINT "SkipTraceRun_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStageHistory" ADD CONSTRAINT "DealStageHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buyer" ADD CONSTRAINT "Buyer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerAssignment" ADD CONSTRAINT "BuyerAssignment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerAssignment" ADD CONSTRAINT "BuyerAssignment_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparableSale" ADD CONSTRAINT "ComparableSale_subjectPropertyId_fkey" FOREIGN KEY ("subjectPropertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign10DLC"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign10DLC" ADD CONSTRAINT "Campaign10DLC_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

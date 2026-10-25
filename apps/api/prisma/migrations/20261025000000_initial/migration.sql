-- VenueVista initial schema; PostGIS and database-level booking invariants included.
-- PostgreSQL administrator must permit extension creation during provisioning.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VenueStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'VIEWED', 'RESPONDED', 'QUOTE_SENT', 'SITE_VISIT_SCHEDULED', 'NEGOTIATING', 'CONFIRMED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'TENTATIVE', 'NOT_CONFIRMED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SiteVisitStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "firebaseUid" TEXT,
    "phone" TEXT,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDevelopment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "avatarUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "businessId" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "organizationId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "VenueStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isDevelopment" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "locality" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location" geography(Point,4326),
    "seatingCapacity" INTEGER NOT NULL,
    "diningCapacity" INTEGER NOT NULL,
    "standingCapacity" INTEGER NOT NULL DEFAULT 0,
    "halls" INTEGER NOT NULL DEFAULT 1,
    "guestRooms" INTEGER NOT NULL DEFAULT 0,
    "parkingCapacity" INTEGER NOT NULL DEFAULT 0,
    "bikeParkingCapacity" INTEGER NOT NULL DEFAULT 0,
    "rentalPricePaise" INTEGER NOT NULL,
    "halfDayPricePaise" INTEGER,
    "cateringPricePaise" INTEGER,
    "decorationPricePaise" INTEGER,
    "securityDepositPaise" INTEGER,
    "additionalCharges" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eventTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bookingPolicy" TEXT,
    "cancellationPolicy" TEXT,
    "restrictions" TEXT,
    "contactPhone" TEXT,
    "whatsappPhone" TEXT,
    "website" TEXT,
    "videoUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueSpace" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "seatingCapacity" INTEGER NOT NULL,
    "diningCapacity" INTEGER NOT NULL,
    "standingCapacity" INTEGER NOT NULL DEFAULT 0,
    "rentalPricePaise" INTEGER NOT NULL,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "VenueSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueMedia" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "originalName" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "caption" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VenueMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenuePricing" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PER_DAY',
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VenuePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenuePackage" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VenuePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenuePolicy" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "bookingRules" TEXT NOT NULL,
    "cancellation" TEXT NOT NULL,
    "restrictions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VenuePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueAvailability" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "spaceId" UUID,
    "date" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'NOT_CONFIRMED',
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VenueAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueBlock" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "spaceId" UUID,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "tentative" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VenueBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "spaceId" UUID,
    "eventDate" DATE NOT NULL,
    "eventType" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "budgetPaise" INTEGER,
    "requirements" TEXT NOT NULL DEFAULT '',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryMessage" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EnquiryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "validUntil" TIMESTAMPTZ(3),
    "acceptedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "SiteVisitStatus" NOT NULL DEFAULT 'PROPOSED',
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "enquiryId" UUID,
    "venueId" UUID NOT NULL,
    "spaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "confirmedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "details" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Venue_city_status_deletedAt_idx" ON "Venue"("city", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Venue_status_featured_createdAt_idx" ON "Venue"("status", "featured", "createdAt");

-- CreateIndex
CREATE INDEX "Venue_ownerId_idx" ON "Venue"("ownerId");

-- CreateIndex
CREATE INDEX "Venue_organizationId_idx" ON "Venue"("organizationId");

-- CreateIndex
CREATE INDEX "Venue_category_rentalPricePaise_idx" ON "Venue"("category", "rentalPricePaise");

-- CreateIndex
CREATE INDEX "Venue_location_idx" ON "Venue" USING GIST ("location");

-- CreateIndex
CREATE INDEX "VenueSpace_venueId_idx" ON "VenueSpace"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueSpace_venueId_name_key" ON "VenueSpace"("venueId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VenueSpace_id_venueId_key" ON "VenueSpace"("id", "venueId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueMedia_storageKey_key" ON "VenueMedia"("storageKey");

-- CreateIndex
CREATE INDEX "VenueMedia_venueId_sortOrder_idx" ON "VenueMedia"("venueId", "sortOrder");

-- CreateIndex
CREATE INDEX "VenuePricing_venueId_idx" ON "VenuePricing"("venueId");

-- CreateIndex
CREATE INDEX "VenuePackage_venueId_idx" ON "VenuePackage"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "VenuePolicy_venueId_key" ON "VenuePolicy"("venueId");

-- CreateIndex
CREATE INDEX "VenueAvailability_venueId_date_status_idx" ON "VenueAvailability"("venueId", "date", "status");

-- CreateIndex
CREATE INDEX "VenueAvailability_spaceId_date_idx" ON "VenueAvailability"("spaceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VenueAvailability_venueId_spaceId_date_key" ON "VenueAvailability"("venueId", "spaceId", "date");

-- CreateIndex
CREATE INDEX "VenueBlock_venueId_startsAt_endsAt_idx" ON "VenueBlock"("venueId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "VenueBlock_spaceId_startsAt_idx" ON "VenueBlock"("spaceId", "startsAt");

-- CreateIndex
CREATE INDEX "Wishlist_userId_createdAt_idx" ON "Wishlist"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_venueId_key" ON "Wishlist"("userId", "venueId");

-- CreateIndex
CREATE INDEX "Enquiry_venueId_status_createdAt_idx" ON "Enquiry"("venueId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_userId_createdAt_idx" ON "Enquiry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_eventDate_idx" ON "Enquiry"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_userId_idempotencyKey_key" ON "Enquiry"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "EnquiryMessage_enquiryId_createdAt_idx" ON "EnquiryMessage"("enquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "Quote_enquiryId_createdAt_idx" ON "Quote"("enquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "SiteVisit_enquiryId_startsAt_idx" ON "SiteVisit"("enquiryId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_enquiryId_key" ON "Booking"("enquiryId");

-- CreateIndex
CREATE INDEX "Booking_spaceId_startsAt_endsAt_idx" ON "Booking"("spaceId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Booking_venueId_startsAt_idx" ON "Booking"("venueId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_venueId_published_idx" ON "Review"("venueId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "Review_venueId_userId_key" ON "Review"("venueId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_idx" ON "VerificationRequest"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueSpace" ADD CONSTRAINT "VenueSpace_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueMedia" ADD CONSTRAINT "VenueMedia_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenuePricing" ADD CONSTRAINT "VenuePricing_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenuePackage" ADD CONSTRAINT "VenuePackage_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenuePolicy" ADD CONSTRAINT "VenuePolicy_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAvailability" ADD CONSTRAINT "VenueAvailability_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAvailability" ADD CONSTRAINT "VenueAvailability_spaceId_venueId_fkey" FOREIGN KEY ("spaceId", "venueId") REFERENCES "VenueSpace"("id", "venueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueBlock" ADD CONSTRAINT "VenueBlock_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueBlock" ADD CONSTRAINT "VenueBlock_spaceId_venueId_fkey" FOREIGN KEY ("spaceId", "venueId") REFERENCES "VenueSpace"("id", "venueId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_spaceId_venueId_fkey" FOREIGN KEY ("spaceId", "venueId") REFERENCES "VenueSpace"("id", "venueId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryMessage" ADD CONSTRAINT "EnquiryMessage_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryMessage" ADD CONSTRAINT "EnquiryMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_spaceId_venueId_fkey" FOREIGN KEY ("spaceId", "venueId") REFERENCES "VenueSpace"("id", "venueId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep the indexed geography synchronized with latitude/longitude, including raw SQL writes.
CREATE FUNCTION venuevista_sync_location() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."location" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326)::geography;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Venue_sync_location"
BEFORE INSERT OR UPDATE OF "latitude", "longitude", "location" ON "Venue"
FOR EACH ROW EXECUTE FUNCTION venuevista_sync_location();

ALTER TABLE "Venue" ADD CONSTRAINT "Venue_coordinates_check"
  CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_capacity_check"
  CHECK ("seatingCapacity" >= 0 AND "diningCapacity" >= 0 AND "standingCapacity" >= 0
    AND "halls" > 0 AND "guestRooms" >= 0 AND "parkingCapacity" >= 0 AND "bikeParkingCapacity" >= 0);
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_price_check"
  CHECK ("rentalPricePaise" >= 0 AND ("halfDayPricePaise" IS NULL OR "halfDayPricePaise" >= 0)
    AND ("cateringPricePaise" IS NULL OR "cateringPricePaise" >= 0)
    AND ("decorationPricePaise" IS NULL OR "decorationPricePaise" >= 0)
    AND ("securityDepositPaise" IS NULL OR "securityDepositPaise" >= 0));
ALTER TABLE "VenueSpace" ADD CONSTRAINT "VenueSpace_capacity_price_check"
  CHECK ("seatingCapacity" >= 0 AND "diningCapacity" >= 0 AND "standingCapacity" >= 0 AND "rentalPricePaise" >= 0);
ALTER TABLE "VenuePricing" ADD CONSTRAINT "VenuePricing_price_check" CHECK ("amountPaise" >= 0);
ALTER TABLE "VenuePackage" ADD CONSTRAINT "VenuePackage_price_check" CHECK ("amountPaise" >= 0);
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_guest_budget_check"
  CHECK ("guestCount" > 0 AND ("budgetPaise" IS NULL OR "budgetPaise" >= 0));
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_price_check" CHECK ("amountPaise" >= 0);
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "VenueBlock" ADD CONSTRAINT "VenueBlock_interval_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_interval_check" CHECK ("endsAt" > "startsAt");

-- Atomic protection for concurrent booking requests; adjacent bookings remain legal.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_confirmed_overlap"
  EXCLUDE USING gist (
    "spaceId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE ("status" = 'CONFIRMED');

-- SQL NULL values do not compare equal in ordinary unique constraints.
-- This partial index prevents duplicate venue-wide availability entries.
CREATE UNIQUE INDEX "VenueAvailability_venue_date_key"
  ON "VenueAvailability" ("venueId", "date") WHERE "spaceId" IS NULL;

CREATE INDEX "Venue_city_insensitive_idx" ON "Venue" (lower("city"), "status")
  WHERE "deletedAt" IS NULL;
CREATE INDEX "Venue_eventTypes_idx" ON "Venue" USING gin ("eventTypes");
CREATE INDEX "Venue_amenities_idx" ON "Venue" USING gin ("amenities");

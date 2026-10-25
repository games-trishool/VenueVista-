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

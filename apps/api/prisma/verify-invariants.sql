-- Run with psql -v ON_ERROR_STOP=1 -f prisma/verify-invariants.sql against development DB.
-- Every test record is rolled back; a failed invariant makes psql return nonzero.
BEGIN;
DO $$
DECLARE
  u uuid := gen_random_uuid();
  v uuid := gen_random_uuid();
  v2 uuid := gen_random_uuid();
  s uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  synced boolean;
BEGIN
  INSERT INTO "User" ("id", "displayName", "role", "isDevelopment", "updatedAt")
    VALUES (u, 'Development database invariant test', 'OWNER', true, now());
  INSERT INTO "Venue" ("id", "ownerId", "name", "description", "category", "city", "state",
    "locality", "pincode", "address", "latitude", "longitude", "seatingCapacity", "diningCapacity",
    "rentalPricePaise", "isDevelopment", "updatedAt")
    VALUES (v, u, 'Development invariant fixture', 'Transaction-only test record', 'FUNCTION_HALL',
      'Visakhapatnam', 'Andhra Pradesh', 'Development', '530001', 'Development fixture only',
      17.6868, 83.2185, 200, 100, 1000000, true, now());
  INSERT INTO "Venue" ("id", "ownerId", "name", "description", "category", "city", "state",
    "locality", "pincode", "address", "latitude", "longitude", "seatingCapacity", "diningCapacity",
    "rentalPricePaise", "isDevelopment", "updatedAt")
    VALUES (v2, u, 'Development other venue', 'Transaction-only test record', 'FUNCTION_HALL',
      'Hyderabad', 'Telangana', 'Development', '500001', 'Development fixture only',
      17.3850, 78.4867, 200, 100, 1000000, true, now());
  INSERT INTO "VenueSpace" ("id", "venueId", "name", "seatingCapacity", "diningCapacity", "rentalPricePaise", "updatedAt")
    VALUES (s, v, 'Development space A', 200, 100, 1000000, now()),
      (s2, v, 'Development space B', 200, 100, 1000000, now());

  SELECT ST_DWithin("location", ST_SetSRID(ST_MakePoint(83.2185, 17.6868), 4326)::geography, 0.01)
    INTO synced FROM "Venue" WHERE "id" = v;
  IF synced IS DISTINCT FROM true THEN RAISE EXCEPTION 'geography insert trigger did not synchronize location'; END IF;
  UPDATE "Venue" SET "longitude" = 83.2190 WHERE "id" = v;
  SELECT ST_DWithin("location", ST_SetSRID(ST_MakePoint(83.2190, 17.6868), 4326)::geography, 0.01)
    INTO synced FROM "Venue" WHERE "id" = v;
  IF synced IS DISTINCT FROM true THEN RAISE EXCEPTION 'geography update trigger did not synchronize location'; END IF;

  INSERT INTO "Booking" ("id", "venueId", "spaceId", "userId", "startsAt", "endsAt", "updatedAt")
    VALUES (gen_random_uuid(), v, s, u, '2030-01-01 00:00:00+00', '2030-01-01 12:00:00+00', now());
  BEGIN
    INSERT INTO "Booking" ("id", "venueId", "spaceId", "userId", "startsAt", "endsAt", "updatedAt")
      VALUES (gen_random_uuid(), v, s, u, '2030-01-01 06:00:00+00', '2030-01-01 18:00:00+00', now());
    RAISE EXCEPTION 'overlapping confirmed booking was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;
  -- Adjacency, another independently bookable space, and cancelled reservations are legal.
  INSERT INTO "Booking" ("id", "venueId", "spaceId", "userId", "startsAt", "endsAt", "updatedAt")
    VALUES (gen_random_uuid(), v, s, u, '2030-01-01 12:00:00+00', '2030-01-02 00:00:00+00', now()),
      (gen_random_uuid(), v, s2, u, '2030-01-01 00:00:00+00', '2030-01-01 12:00:00+00', now());
  INSERT INTO "Booking" ("id", "venueId", "spaceId", "userId", "startsAt", "endsAt", "status", "updatedAt")
    VALUES (gen_random_uuid(), v, s, u, '2030-01-01 06:00:00+00', '2030-01-01 18:00:00+00', 'CANCELLED', now());
  BEGIN
    INSERT INTO "Booking" ("id", "venueId", "spaceId", "userId", "startsAt", "endsAt", "updatedAt")
      VALUES (gen_random_uuid(), v2, s, u, '2030-02-01 00:00:00+00', '2030-02-02 00:00:00+00', now());
    RAISE EXCEPTION 'cross-venue space reference was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "Booking" ("id", "venueId", "spaceId", "userId", "startsAt", "endsAt", "updatedAt")
      VALUES (gen_random_uuid(), v, s, u, '2030-03-02 00:00:00+00', '2030-03-01 00:00:00+00', now());
    RAISE EXCEPTION 'inverted booking interval was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO "VenueAvailability" ("id", "venueId", "date", "status", "updatedAt")
    VALUES (gen_random_uuid(), v, '2030-04-01', 'AVAILABLE', now());
  BEGIN
    INSERT INTO "VenueAvailability" ("id", "venueId", "date", "status", "updatedAt")
      VALUES (gen_random_uuid(), v, '2030-04-01', 'UNAVAILABLE', now());
    RAISE EXCEPTION 'duplicate venue-wide availability was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    UPDATE "Venue" SET "rentalPricePaise" = -1 WHERE "id" = v;
    RAISE EXCEPTION 'negative venue price was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'PASS: geography insert/update, overlap exclusion, adjacency, independent spaces, cancellation, cross-venue FK, interval, availability uniqueness and nonnegative money';
END;
$$;
ROLLBACK;

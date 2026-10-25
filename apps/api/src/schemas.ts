import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const uuid = z.string().uuid();
export const text = (max = 500) => z.string().trim().min(1).max(max);
export const money = z.number().int().min(0).max(2_000_000_000);
export const count = z.number().int().min(0).max(100_000);
export const categories = [
  'FUNCTION_HALL',
  'CONVENTION_HALL',
  'WEDDING_GARDEN',
  'RESORT',
  'BANQUET_HALL',
  'FARMHOUSE',
  'OUTDOOR_VENUE',
  'PARTY_HALL',
  'CORPORATE_SPACE',
] as const;
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    'Invalid calendar date',
  );
export const futureDate = dateOnly.refine(
  (s) => s >= new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
  'Choose today or a future event date',
);
export const spaceSchema = z
  .object({
    name: text(120),
    seatingCapacity: count.positive(),
    diningCapacity: count.optional(),
    standingCapacity: count.optional(),
    rentalPricePaise: money.optional(),
    amenities: z.array(text(80)).max(40).optional(),
  })
  .strict();
export const venueSchema = z
  .object({
    organizationId: uuid.optional(),
    name: text(160),
    description: text(6000),
    category: z.enum(categories),
    city: text(100),
    state: text(100),
    district: text(100).optional(),
    locality: text(150),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/),
    address: text(1000),
    latitude: z.number().min(6).max(38),
    longitude: z.number().min(68).max(98),
    seatingCapacity: count.positive(),
    diningCapacity: count,
    standingCapacity: count.optional(),
    halls: count.min(1).optional(),
    guestRooms: count.optional(),
    parkingCapacity: count.optional(),
    bikeParkingCapacity: count.optional(),
    rentalPricePaise: money,
    halfDayPricePaise: money.optional(),
    cateringPricePaise: money.optional(),
    decorationPricePaise: money.optional(),
    securityDepositPaise: money.optional(),
    additionalCharges: text(2000).optional(),
    amenities: z.array(text(80)).max(40),
    eventTypes: z.array(text(80)).max(20).min(1),
    bookingPolicy: text(4000).optional(),
    policies: text(4000).optional(),
    cancellationPolicy: text(4000).optional(),
    restrictions: text(2000).optional(),
    contactPhone: z
      .string()
      .regex(/^\+91[6-9]\d{9}$/)
      .optional(),
    whatsappPhone: z
      .string()
      .regex(/^\+91[6-9]\d{9}$/)
      .optional(),
    spaces: z.array(spaceSchema).max(20).optional(),
  })
  .strict();
export const enquirySchema = z
  .object({
    venueId: uuid,
    spaceId: uuid.optional(),
    eventDate: futureDate,
    eventType: text(80),
    guestCount: count.positive(),
    budgetPaise: money.optional(),
    requirements: z.string().trim().max(4000).default(''),
    idempotencyKey: uuid,
  })
  .strict();
export const quoteSchema = z
  .object({
    amountPaise: money.positive(),
    description: text(4000),
    validUntil: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
export const searchSchema = z
  .object({
    city: z.string().trim().max(100).optional(),
    q: z.string().trim().max(200).optional(),
    category: z.enum(categories).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    minCapacity: z.coerce.number().int().min(0).optional(),
    diningCapacity: z.coerce.number().int().min(0).optional(),
    amenities: z.string().max(1000).optional(),
    eventType: z.string().max(100).optional(),
    eventDate: dateOnly.optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(1).max(500).default(50),
    sort: z
      .enum(['relevance', 'nearest', 'price_asc', 'price_desc', 'capacity', 'recent'])
      .default('relevance'),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    (s) => (s.latitude === undefined) === (s.longitude === undefined),
    'Both coordinates are required',
  )
  .refine(
    (s) => s.sort !== 'nearest' || s.latitude !== undefined,
    'Nearest sorting requires coordinates',
  )
  .refine(
    (s) => s.minPrice === undefined || s.maxPrice === undefined || s.minPrice <= s.maxPrice,
    'Invalid price range',
  );

export function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException({
      message: 'Validation failed',
      details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  return result.data;
}

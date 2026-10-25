import { z } from 'zod';
export const inrPaise = z.number().int().nonnegative().max(1_000_000_000);
export const indianPhone = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, 'Use an Indian phone number in +91 format');
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Enter a valid calendar date',
  );
export const enquiryInput = z.object({
  venueId: z.string().uuid(),
  spaceId: z.string().uuid().optional(),
  eventDate: isoDate,
  eventType: z.string().min(2).max(80),
  guestCount: z.number().int().min(1).max(100000),
  budgetPaise: inrPaise.optional(),
  requirements: z.string().max(3000).optional(),
  idempotencyKey: z.string().uuid(),
});

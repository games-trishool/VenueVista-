import { describe, expect, it, afterEach } from 'vitest';
import { devAuthEnabled, authSecret, AuthService } from '../src/auth';
import { enquirySchema, searchSchema, venueSchema, dateOnly } from '../src/schemas';
import { imageType } from '../src/media.service';
import { PrismaService } from '../src/prisma.service';
import { sign } from 'jsonwebtoken';

describe('Input validation', () => {
  it('rejects impossible calendar dates', () => {
    expect(dateOnly.safeParse('2027-02-30').success).toBe(false);
    expect(dateOnly.safeParse('2028-02-29').success).toBe(true);
  });
  it('rejects client-supplied publication status and owner ID', () => {
    expect(venueSchema.partial().safeParse({ status: 'APPROVED' }).success).toBe(false);
    expect(venueSchema.partial().safeParse({ ownerId: 'pretend-owner' }).success).toBe(false);
  });
  it('requires both geospatial coordinates and safe pagination', () => {
    expect(searchSchema.safeParse({ latitude: '17.7' }).success).toBe(false);
    expect(searchSchema.safeParse({ page: '0' }).success).toBe(false);
    expect(searchSchema.safeParse({ sort: 'nearest' }).success).toBe(false);
    expect(
      searchSchema.parse({ latitude: '17.7', longitude: '83.2', sort: 'nearest' }).latitude,
    ).toBe(17.7);
  });
  it('rejects invalid budget ranges', () => {
    expect(searchSchema.safeParse({ minPrice: '500', maxPrice: '100' }).success).toBe(false);
  });
  it('rejects expired event dates and duplicate-key omissions', () => {
    expect(
      enquirySchema.safeParse({
        venueId: 'f3b96d2d-b8d7-44c6-a963-2729b3d344df',
        eventDate: '2020-01-01',
        eventType: 'WEDDING',
        guestCount: 30,
      }).success,
    ).toBe(false);
  });
  it('rejects non-image files regardless of filename', () => {
    expect(imageType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(imageType(Buffer.from('fake.jpg'))).toBeNull();
  });
});

describe('Authentication fail-closed behavior', () => {
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_DEV_AUTH: process.env.ENABLE_DEV_AUTH,
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
  };
  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  it('disables development sessions in production even when flag is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEV_AUTH = 'true';
    expect(devAuthEnabled()).toBe(false);
  });
  it('requires explicit opt-in for development sessions', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ENABLE_DEV_AUTH;
    expect(devAuthEnabled()).toBe(false);
  });
  it('requires a strong configured signing secret', () => {
    process.env.AUTH_JWT_SECRET = 'short';
    expect(() => authSecret()).toThrow('at least 32');
  });
  it('rejects forged JWTs before database access', async () => {
    process.env.AUTH_JWT_SECRET = 'a'.repeat(40);
    const auth = new AuthService({} as PrismaService);
    const forged = sign({ sub: 'user', role: 'ADMIN' }, 'wrong-secret', {
      issuer: 'venuevista',
      audience: 'venuevista-apps',
    });
    await expect(auth.verifyToken(forged)).rejects.toThrow('Session expired');
  });
  it('rejects signed role claims that no longer match the database', async () => {
    process.env.AUTH_JWT_SECRET = 'a'.repeat(40);
    const fakeDb = {
      user: {
        findUnique: async () => ({
          id: 'id',
          role: 'CUSTOMER',
          displayName: 'Customer',
          phone: null,
          status: 'ACTIVE',
          deletedAt: null,
          isDevelopment: false,
        }),
      },
    } as unknown as PrismaService;
    const auth = new AuthService(fakeDb);
    const token = sign({ role: 'ADMIN' }, process.env.AUTH_JWT_SECRET, {
      subject: 'id',
      issuer: 'venuevista',
      audience: 'venuevista-apps',
    });
    await expect(auth.verifyToken(token)).rejects.toThrow('Session expired');
  });
  it('rejects nondevelopment administrator sessions without signed MFA attestation', async () => {
    process.env.AUTH_JWT_SECRET = 'a'.repeat(40);
    const fakeDb = {
      user: {
        findUnique: async () => ({
          id: 'id',
          role: 'ADMIN',
          displayName: 'Admin',
          phone: null,
          status: 'ACTIVE',
          deletedAt: null,
          isDevelopment: false,
        }),
      },
    } as unknown as PrismaService;
    const auth = new AuthService(fakeDb);
    const token = sign({ role: 'ADMIN', adminMfa: false }, process.env.AUTH_JWT_SECRET, {
      subject: 'id',
      issuer: 'venuevista',
      audience: 'venuevista-apps',
    });
    await expect(auth.verifyToken(token)).rejects.toThrow('Session expired');
  });
});

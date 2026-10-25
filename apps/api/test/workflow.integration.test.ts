import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma.service';
import { AuthService } from '../src/auth';

describe.skipIf(process.env.ENABLE_INTEGRATION_TESTS !== 'true')(
  'Real PostgreSQL/PostGIS marketplace workflow',
  () => {
    let app: INestApplication, db: PrismaService;
    let owner: string, customer: string, admin: string, otherOwner: string, otherOwnerId: string;
    let venueId: string,
      organizationId: string,
      enquiryId: string,
      quoteId: string,
      spaceId: string,
      mediaId: string;
    const key = randomUUID(),
      tag = `TEST ${randomUUID().slice(0, 8)}`;
    const venueIds: string[] = [],
      storageKeys: string[] = [];
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 30);
    const eventDate = date.toISOString().slice(0, 10);
    const draft = {
      name: `${tag} Function Hall`,
      description:
        'Clearly labelled integration test fixture. This is not a real commercial listing.',
      category: 'FUNCTION_HALL',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      locality: 'Test locality',
      pincode: '530001',
      address: 'Integration test address',
      latitude: 17.6868,
      longitude: 83.2185,
      seatingCapacity: 500,
      diningCapacity: 250,
      rentalPricePaise: 10_000_000,
      amenities: ['AC', 'PARKING'],
      eventTypes: ['WEDDING', 'BIRTHDAY'],
    };
    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
    const get = () => request(app.getHttpServer());
    beforeAll(async () => {
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_AUTH !== 'true')
        throw new Error(
          'Integration test requires a non-production database and ENABLE_DEV_AUTH=true',
        );
      if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      app = await createApp();
      await app.init();
      db = app.get(PrismaService);
      for (const [persona, set] of [
        ['owner', (t: string) => (owner = t)],
        ['customer', (t: string) => (customer = t)],
        ['admin', (t: string) => (admin = t)],
      ] as const) {
        const res = await get().post('/api/v1/auth/dev-session').send({ persona });
        expect(res.status).toBe(201);
        set(res.body.accessToken);
      }
      const second = await db.user.create({
        data: {
          firebaseUid: `dev:test:${randomUUID()}`,
          displayName: `${tag} Other Owner`,
          role: 'OWNER',
          isDevelopment: true,
        },
      });
      otherOwnerId = second.id;
      otherOwner = app.get(AuthService).issue(second).accessToken;
    });
    afterAll(async () => {
      if (db) {
        const ids = venueIds;
        const enquiries = await db.enquiry.findMany({
          where: { venueId: { in: ids } },
          select: { id: true },
        });
        const eids = enquiries.map((e) => e.id);
        const media = await db.venueMedia.findMany({
          where: { venueId: { in: ids } },
          select: { storageKey: true },
        });
        storageKeys.push(...media.flatMap((m) => (m.storageKey ? [m.storageKey] : [])));
        const bookings = await db.booking.findMany({
          where: { venueId: { in: ids } },
          select: { id: true },
        });
        await db.booking.deleteMany({ where: { venueId: { in: ids } } });
        await db.enquiry.deleteMany({ where: { venueId: { in: ids } } });
        await db.notification.deleteMany({
          where: {
            OR: [
              ...ids.map((id) => ({ data: { path: ['venueId'], equals: id } })),
              ...eids.map((id) => ({ data: { path: ['enquiryId'], equals: id } })),
            ],
          },
        });
        await db.auditLog.deleteMany({
          where: {
            OR: [
              {
                entityId: {
                  in: [
                    ...ids,
                    ...eids,
                    ...bookings.map((b) => b.id),
                    ...(organizationId ? [organizationId] : []),
                  ],
                },
              },
              ...(otherOwnerId ? [{ actorId: otherOwnerId }] : []),
            ],
          },
        });
        await db.venue.deleteMany({ where: { id: { in: ids } } });
        if (organizationId) await db.organization.delete({ where: { id: organizationId } });
        if (otherOwnerId) await db.user.delete({ where: { id: otherOwnerId } });
        for (const key of storageKeys)
          await unlink(
            resolve(process.env.MEDIA_STORAGE_PATH ?? '/tmp/venuevista-uploads', key),
          ).catch(() => {});
      }
      if (app) await app.close();
    });
    it('reports actual PostgreSQL and PostGIS readiness', async () => {
      const res = await get().get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.postgis).toBeTruthy();
    });
    it('blocks anonymous admin calls and customer privilege escalation', async () => {
      expect((await get().get('/api/v1/admin/overview')).status).toBe(401);
      expect((await get().get('/api/v1/admin/overview').set(auth(customer))).status).toBe(403);
      expect(
        (await get().post('/api/v1/auth/dev-session').send({ persona: 'customer', role: 'ADMIN' }))
          .status,
      ).toBe(400);
    });
    it('requires reauthentication with MFA after trusted admin role provisioning', async () => {
      const user = await db.user.create({
        data: {
          firebaseUid: `test:${randomUUID()}`,
          displayName: `${tag} Role Change`,
          role: 'CUSTOMER',
          isDevelopment: false,
        },
      });
      try {
        const stale = app.get(AuthService).issue(user).accessToken;
        const promoted = await db.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
        expect((await get().get('/api/v1/admin/overview').set(auth(stale))).status).toBe(401);
        expect(
          (
            await get()
              .get('/api/v1/admin/overview')
              .set(auth(app.get(AuthService).issue(promoted).accessToken))
          ).status,
        ).toBe(401);
      } finally {
        await db.user.delete({ where: { id: user.id } });
      }
    });
    it('creates a business and a real draft venue with a space', async () => {
      const org = await get()
        .post('/api/v1/organizations')
        .set(auth(owner))
        .send({ name: `${tag} Organization` });
      expect(org.status).toBe(201);
      organizationId = org.body.id;
      const res = await get()
        .post('/api/v1/partner/venues')
        .set(auth(owner))
        .send({ ...draft, organizationId });
      expect(res.status).toBe(201);
      venueId = res.body.id;
      venueIds.push(venueId);
      spaceId = res.body.spaces[0].id;
      expect(res.body.status).toBe('DRAFT');
      expect((await get().get(`/api/v1/venues/${venueId}`)).status).toBe(404);
    });
    it('enforces owner-level access and protects server-assigned status', async () => {
      expect(
        (
          await get()
            .patch(`/api/v1/partner/venues/${venueId}`)
            .set(auth(otherOwner))
            .send({ name: 'Unauthorized edit' })
        ).status,
      ).toBe(403);
      expect(
        (
          await get()
            .patch(`/api/v1/partner/venues/${venueId}`)
            .set(auth(owner))
            .send({ status: 'APPROVED' })
        ).status,
      ).toBe(400);
    });
    it('requires genuine decodable photos before venue submission', async () => {
      expect(
        (await get().post(`/api/v1/partner/venues/${venueId}/submit`).set(auth(owner))).status,
      ).toBe(400);
      expect(
        (
          await get()
            .post(`/api/v1/partner/venues/${venueId}/media`)
            .set(auth(owner))
            .attach('file', Buffer.from('pretend image'), {
              filename: 'fake.jpg',
              contentType: 'image/jpeg',
            })
        ).status,
      ).toBe(400);
      const png = await sharp({
        create: { width: 4, height: 4, channels: 3, background: '#7655e8' },
      })
        .png()
        .toBuffer();
      const upload = await get()
        .post(`/api/v1/partner/venues/${venueId}/media`)
        .set(auth(owner))
        .attach('file', png, { filename: 'test-fixture.png', contentType: 'image/png' });
      expect(upload.status).toBe(201);
      mediaId = upload.body.id;
      expect((await get().get(`/api/v1/media/${mediaId}`)).status).toBe(403);
      expect((await get().get(`/api/v1/media/${mediaId}`).set(auth(owner))).status).toBe(200);
      expect(
        (await get().post(`/api/v1/partner/venues/${venueId}/submit`).set(auth(owner))).body.status,
      ).toBe('PENDING');
    });
    it('verifies business, requires rejection reasons, and audits approval', async () => {
      expect(
        (
          await get()
            .post(`/api/v1/admin/venues/${venueId}/review`)
            .set(auth(admin))
            .send({ decision: 'REJECTED' })
        ).status,
      ).toBe(400);
      expect(
        (
          await get()
            .post(`/api/v1/admin/venues/${venueId}/review`)
            .set(auth(owner))
            .send({ decision: 'APPROVED' })
        ).status,
      ).toBe(403);
      expect(
        (
          await get()
            .post(`/api/v1/admin/organizations/${organizationId}/review`)
            .set(auth(admin))
            .send({ decision: 'APPROVED' })
        ).status,
      ).toBe(201);
      const res = await get()
        .post(`/api/v1/admin/venues/${venueId}/review`)
        .set(auth(admin))
        .send({ decision: 'APPROVED' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('APPROVED');
      expect(
        await db.auditLog.count({ where: { entityId: venueId, action: 'VENUE_APPROVED' } }),
      ).toBe(1);
    });
    it('filters cities and runs PostGIS distance queries without leaking previous-city results', async () => {
      const correct = await get().get('/api/v1/venues').query({ city: 'Visakhapatnam', q: tag });
      expect(correct.status).toBe(200);
      expect(correct.body.items.map((v: { id: string }) => v.id)).toContain(venueId);
      const wrong = await get().get('/api/v1/venues').query({ city: 'Hyderabad', q: tag });
      expect(wrong.body.items).toEqual([]);
      const nearby = await get()
        .get('/api/v1/venues')
        .query({ latitude: 17.6868, longitude: 83.2185, radiusKm: 5, sort: 'nearest', q: tag });
      expect(nearby.status).toBe(200);
      expect(nearby.body.items.map((v: { id: string }) => v.id)).toContain(venueId);
      const far = await get()
        .get('/api/v1/venues')
        .query({ latitude: 17.385, longitude: 78.4867, radiusKm: 5, q: tag });
      expect(far.body.items).toEqual([]);
      const filtered = await get()
        .get('/api/v1/venues')
        .query({ city: 'Visakhapatnam', q: tag, maxPrice: 1 });
      expect(filtered.body.items).toEqual([]);
    });
    it('filters known unavailable dates across active spaces without inventing availability', async () => {
      const date = new Date(eventDate);
      date.setUTCDate(date.getUTCDate() + 5);
      const unavailableDate = date.toISOString().slice(0, 10);
      const search = () =>
        get()
          .get('/api/v1/venues')
          .query({ city: 'Visakhapatnam', q: tag, eventDate: unavailableDate });
      const availability = (id: string, status: string) =>
        get()
          .put(`/api/v1/partner/spaces/${id}/availability`)
          .set(auth(owner))
          .send({ date: unavailableDate, status });
      expect((await availability(spaceId, 'UNAVAILABLE')).status).toBe(200);
      expect((await search()).body.items).toEqual([]);
      expect(
        (await get().get('/api/v1/venues').query({ city: 'Visakhapatnam', q: tag })).body.items.map(
          (v: { id: string }) => v.id,
        ),
      ).toContain(venueId);
      const alternate = await db.venueSpace.create({
        data: {
          venueId,
          name: 'Date filtering test space',
          seatingCapacity: 100,
          diningCapacity: 50,
          rentalPricePaise: 1_000_000,
        },
      });
      try {
        // An undeclared or tentative second space can still receive an enquiry.
        expect((await search()).body.items.map((v: { id: string }) => v.id)).toContain(venueId);
        expect((await availability(alternate.id, 'UNAVAILABLE')).status).toBe(200);
        expect((await search()).body.items).toEqual([]);
        expect((await availability(alternate.id, 'TENTATIVE')).status).toBe(200);
        expect((await search()).body.items.map((v: { id: string }) => v.id)).toContain(venueId);
        const closure = await db.venueAvailability.create({
          data: { venueId, date: new Date(unavailableDate), status: 'UNAVAILABLE' },
        });
        expect((await search()).body.items).toEqual([]);
        await db.venueAvailability.delete({ where: { id: closure.id } });
        await db.venueSpace.update({
          where: { id: alternate.id },
          data: { deletedAt: new Date() },
        });
        expect((await search()).body.items).toEqual([]);
        expect((await availability(alternate.id, 'AVAILABLE')).status).toBe(404);
      } finally {
        await db.venueSpace.delete({ where: { id: alternate.id } });
        await db.venueAvailability.deleteMany({
          where: { venueId, date: new Date(unavailableDate) },
        });
      }
    });
    it('withdraws public approval when a new independently bookable space is added', async () => {
      const added = await get()
        .post(`/api/v1/partner/venues/${venueId}/spaces`)
        .set(auth(owner))
        .send({ name: 'Secondary reviewed space', seatingCapacity: 150 });
      expect(added.status).toBe(201);
      expect((await db.venue.findUniqueOrThrow({ where: { id: venueId } })).status).toBe('DRAFT');
      expect((await get().get(`/api/v1/venues/${venueId}`)).status).toBe(404);
      expect(
        (await get().post(`/api/v1/partner/venues/${venueId}/submit`).set(auth(owner))).status,
      ).toBe(201);
      expect(
        (
          await get()
            .post(`/api/v1/admin/venues/${venueId}/review`)
            .set(auth(admin))
            .send({ decision: 'APPROVED' })
        ).status,
      ).toBe(201);
    });
    it('persists wishlists idempotently', async () => {
      expect((await get().put(`/api/v1/wishlist/${venueId}`).set(auth(customer))).status).toBe(200);
      expect((await get().put(`/api/v1/wishlist/${venueId}`).set(auth(customer))).status).toBe(200);
      const res = await get().get('/api/v1/wishlist').set(auth(customer));
      expect(res.body.filter((v: { id: string }) => v.id === venueId)).toHaveLength(1);
    });
    it('creates one enquiry for retrying submissions and notifies the owner', async () => {
      const payload = {
        venueId,
        spaceId,
        eventDate,
        eventType: 'WEDDING',
        guestCount: 200,
        budgetPaise: 12_000_000,
        requirements: 'Integration test enquiry',
        idempotencyKey: key,
      };
      const res = await get().post('/api/v1/enquiries').set(auth(customer)).send(payload);
      expect(res.status).toBe(201);
      enquiryId = res.body.id;
      expect(res.body.status).toBe('NEW');
      const retry = await get().post('/api/v1/enquiries').set(auth(customer)).send(payload);
      expect(retry.body.id).toBe(enquiryId);
      expect(
        (
          await get()
            .post('/api/v1/enquiries')
            .set(auth(customer))
            .send({ ...payload, guestCount: 100 })
        ).status,
      ).toBe(409);
      expect(
        await db.notification.count({
          where: { data: { path: ['enquiryId'], equals: enquiryId }, title: 'New venue enquiry' },
        }),
      ).toBe(1);
      expect((await get().get(`/api/v1/enquiries/${enquiryId}`).set(auth(otherOwner))).status).toBe(
        403,
      );
    });
    it('persists a quotation and lets the customer track the updated status', async () => {
      expect(
        (
          await get()
            .post(`/api/v1/enquiries/${enquiryId}/quotes`)
            .set(auth(customer))
            .send({ amountPaise: 1, description: 'Invalid actor' })
        ).status,
      ).toBe(403);
      const quote = await get()
        .post(`/api/v1/enquiries/${enquiryId}/quotes`)
        .set(auth(owner))
        .send({
          amountPaise: 11_000_000,
          description: 'Rental quote. Additional services excluded.',
        });
      expect(quote.status).toBe(201);
      quoteId = quote.body.id;
      const tracked = await get().get(`/api/v1/enquiries/${enquiryId}`).set(auth(customer));
      expect(tracked.body.status).toBe('QUOTE_SENT');
      expect(tracked.body.quotes[0].amountPaise).toBe(11_000_000);
    });
    it('requires customer acceptance and explicit owner confirmation to book', async () => {
      const payload = {
        spaceId,
        quoteId,
        startsAt: `${eventDate}T09:00:00+05:30`,
        endsAt: `${eventDate}T20:00:00+05:30`,
        confirmation: true,
      };
      expect(
        (await get().post(`/api/v1/enquiries/${enquiryId}/confirm`).set(auth(owner)).send(payload))
          .status,
      ).toBe(400);
      expect(
        (
          await get()
            .post(`/api/v1/enquiries/${enquiryId}/quotes/${quoteId}/accept`)
            .set(auth(customer))
        ).status,
      ).toBe(201);
      const booking = await get()
        .post(`/api/v1/enquiries/${enquiryId}/confirm`)
        .set(auth(owner))
        .send(payload);
      expect(booking.status).toBe(201);
      expect(booking.body.status).toBe('CONFIRMED');
      expect(
        (await get().get(`/api/v1/enquiries/${enquiryId}`).set(auth(customer))).body.status,
      ).toBe('CONFIRMED');
    });
    it('rejects overlapping confirmed bookings at database level', async () => {
      const customerUser = await app.get(AuthService).verifyToken(customer);
      await expect(
        db.booking.create({
          data: {
            venueId,
            spaceId,
            userId: customerUser.id,
            startsAt: new Date(`${eventDate}T10:00:00+05:30`),
            endsAt: new Date(`${eventDate}T12:00:00+05:30`),
          },
        }),
      ).rejects.toThrow();
      const enquiry = await get().post('/api/v1/enquiries').set(auth(customer)).send({
        venueId,
        spaceId,
        eventDate,
        eventType: 'WEDDING',
        guestCount: 50,
        idempotencyKey: randomUUID(),
      });
      expect(enquiry.status).toBe(201);
      const quote = await get()
        .post(`/api/v1/enquiries/${enquiry.body.id}/quotes`)
        .set(auth(owner))
        .send({ amountPaise: 10_000_000, description: 'Overlapping booking test quote' });
      expect(quote.status).toBe(201);
      expect(
        (
          await get()
            .post(`/api/v1/enquiries/${enquiry.body.id}/quotes/${quote.body.id}/accept`)
            .set(auth(customer))
        ).status,
      ).toBe(201);
      const conflict = await get()
        .post(`/api/v1/enquiries/${enquiry.body.id}/confirm`)
        .set(auth(owner))
        .send({
          spaceId,
          quoteId: quote.body.id,
          startsAt: `${eventDate}T10:00:00+05:30`,
          endsAt: `${eventDate}T12:00:00+05:30`,
          confirmation: true,
        });
      expect(conflict.status).toBe(409);
    });
    it('serializes customer cancellation against owner booking confirmation', async () => {
      const next = new Date(eventDate);
      next.setUTCDate(next.getUTCDate() + 1);
      const nextDate = next.toISOString().slice(0, 10);
      const enquiry = await get().post('/api/v1/enquiries').set(auth(customer)).send({
        venueId,
        spaceId,
        eventDate: nextDate,
        eventType: 'WEDDING',
        guestCount: 50,
        idempotencyKey: randomUUID(),
      });
      expect(enquiry.status).toBe(201);
      const quote = await get()
        .post(`/api/v1/enquiries/${enquiry.body.id}/quotes`)
        .set(auth(owner))
        .send({ amountPaise: 10_000_000, description: 'Concurrency test quotation' });
      expect(quote.status).toBe(201);
      expect(
        (
          await get()
            .post(`/api/v1/enquiries/${enquiry.body.id}/quotes/${quote.body.id}/accept`)
            .set(auth(customer))
        ).status,
      ).toBe(201);
      const [confirm, cancel] = await Promise.all([
        get()
          .post(`/api/v1/enquiries/${enquiry.body.id}/confirm`)
          .set(auth(owner))
          .send({
            spaceId,
            quoteId: quote.body.id,
            startsAt: `${nextDate}T09:00:00+05:30`,
            endsAt: `${nextDate}T20:00:00+05:30`,
            confirmation: true,
          }),
        get()
          .post(`/api/v1/enquiries/${enquiry.body.id}/status`)
          .set(auth(customer))
          .send({ status: 'CANCELLED' }),
      ]);
      expect([confirm.status, cancel.status].sort()).toEqual([201, 409]);
      const final = await db.enquiry.findUniqueOrThrow({
        where: { id: enquiry.body.id },
        include: { booking: true },
      });
      expect(final.status).toBe(confirm.status === 201 ? 'CONFIRMED' : 'CANCELLED');
      expect(!!final.booking).toBe(confirm.status === 201);
      const lateQuote = await get()
        .post(`/api/v1/enquiries/${enquiry.body.id}/quotes`)
        .set(auth(owner))
        .send({ amountPaise: 1, description: 'Must not reopen terminal enquiry' });
      expect(lateQuote.status).toBe(409);
    });
    it('withdraws approved edits and removes them from discovery', async () => {
      const res = await get()
        .patch(`/api/v1/partner/venues/${venueId}`)
        .set(auth(owner))
        .send({ description: 'Updated test description requires another review' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DRAFT');
      expect(
        (await get().get('/api/v1/venues').query({ city: 'Visakhapatnam', q: tag })).body.items,
      ).toEqual([]);
    });
    it('retains administrative suspension across owner content and availability edits', async () => {
      expect(
        (
          await get()
            .post(`/api/v1/admin/venues/${venueId}/suspend`)
            .set(auth(admin))
            .send({ reason: 'Integration test moderation hold' })
        ).status,
      ).toBe(201);
      const png = await sharp({
        create: { width: 4, height: 4, channels: 3, background: '#7655e8' },
      })
        .png()
        .toBuffer();
      expect(
        (
          await get()
            .post(`/api/v1/partner/venues/${venueId}/media`)
            .set(auth(owner))
            .attach('file', png, { filename: 'suspended.png', contentType: 'image/png' })
        ).status,
      ).toBe(403);
      expect(
        (await get().delete(`/api/v1/partner/venues/${venueId}/media/${mediaId}`).set(auth(owner)))
          .status,
      ).toBe(403);
      expect(
        (
          await get()
            .post(`/api/v1/partner/venues/${venueId}/spaces`)
            .set(auth(owner))
            .send({ name: 'Forbidden space', seatingCapacity: 100 })
        ).status,
      ).toBe(403);
      expect(
        (
          await get()
            .put(`/api/v1/partner/spaces/${spaceId}/availability`)
            .set(auth(owner))
            .send({ date: eventDate, status: 'AVAILABLE' })
        ).status,
      ).toBe(403);
      expect(
        (
          await get()
            .patch(`/api/v1/partner/venues/${venueId}`)
            .set(auth(owner))
            .send({ name: 'Forbidden edit' })
        ).status,
      ).toBe(403);
      expect(
        (await get().post(`/api/v1/partner/venues/${venueId}/submit`).set(auth(owner))).status,
      ).toBe(409);
      expect((await db.venue.findUniqueOrThrow({ where: { id: venueId } })).status).toBe(
        'SUSPENDED',
      );
      expect(await db.venueMedia.count({ where: { id: mediaId } })).toBe(1);
      expect(
        (await get().get('/api/v1/venues').query({ city: 'Visakhapatnam', q: tag })).body.items,
      ).toEqual([]);
    });
  },
);

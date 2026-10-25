import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from './prisma.service';
import { SessionUser } from './auth';
import { searchSchema, venueSchema } from './schemas';

export const venueRelations = {
  media: { orderBy: { sortOrder: 'asc' } },
  spaces: { where: { deletedAt: null } },
  pricing: true,
  packages: true,
  policy: true,
} satisfies Prisma.VenueInclude;
export type VenueInput = z.infer<typeof venueSchema>;
export type SearchInput = z.infer<typeof searchSchema>;

@Injectable()
export class VenueService {
  constructor(@Inject(PrismaService) readonly db: PrismaService) {}
  async owned(id: string, user: SessionUser) {
    const venue = await this.db.venue.findFirst({ where: { id, deletedAt: null } });
    if (!venue) throw new NotFoundException('Venue not found');
    if (venue.ownerId !== user.id && user.role !== 'ADMIN')
      throw new ForbiddenException('This venue belongs to another owner');
    return venue;
  }
  async create(input: VenueInput, user: SessionUser) {
    if (input.organizationId) {
      const organization = await this.db.organization.findFirst({
        where: {
          id: input.organizationId,
          ownerId: user.id,
          deletedAt: null,
          status: { not: 'SUSPENDED' },
        },
      });
      if (!organization)
        throw new ForbiddenException('Business profile belongs to another owner or is suspended');
    }
    const { spaces, policies, ...data } = input;
    return this.db.venue.create({
      data: {
        ...data,
        bookingPolicy: data.bookingPolicy ?? policies,
        ownerId: user.id,
        isDevelopment: user.isDevelopment,
        spaces: {
          create: (spaces?.length
            ? spaces
            : [{ name: 'Main space', seatingCapacity: input.seatingCapacity }]
          ).map((s) => ({
            ...s,
            diningCapacity: s.diningCapacity ?? input.diningCapacity,
            rentalPricePaise: s.rentalPricePaise ?? input.rentalPricePaise,
            amenities: s.amenities ?? input.amenities,
          })),
        },
      },
      include: venueRelations,
    });
  }
  async update(id: string, input: Partial<VenueInput>, user: SessionUser) {
    const venue = await this.owned(id, user);
    if (venue.status === 'SUSPENDED')
      throw new ForbiddenException('Suspended venues cannot be edited');
    if (
      input.organizationId &&
      !(await this.db.organization.findFirst({
        where: { id: input.organizationId, ownerId: user.id, deletedAt: null },
      }))
    )
      throw new ForbiddenException('Business profile belongs to another owner');
    const { spaces, policies, ...data } = input;
    if (spaces)
      throw new BadRequestException('Use the spaces endpoint to add independently bookable spaces');
    // Editing approved content withdraws publication and requires another review.
    return this.db.$transaction(async (tx) => {
      const updated = await tx.venue.updateMany({
        where: { id, status: { not: 'SUSPENDED' } },
        data: {
          ...data,
          ...(policies ? { bookingPolicy: policies } : {}),
          status: 'DRAFT',
          rejectionReason: null,
        },
      });
      if (!updated.count) throw new ForbiddenException('Suspended venues cannot be edited');
      return tx.venue.findUnique({ where: { id }, include: venueRelations });
    });
  }
  async submit(id: string, user: SessionUser) {
    const venue = await this.owned(id, user);
    if (!['DRAFT', 'REJECTED'].includes(venue.status))
      throw new ConflictException('Only draft or rejected venues can be submitted');
    if (!venue.organizationId)
      throw new BadRequestException('Add a business profile before submitting the listing');
    const business = await this.db.organization.findFirst({
      where: { id: venue.organizationId, ownerId: user.id, deletedAt: null },
    });
    if (!business || ['REJECTED', 'SUSPENDED'].includes(business.status))
      throw new BadRequestException('Resolve the business verification issue before submitting');
    const mediaCount = await this.db.venueMedia.count({ where: { venueId: id } });
    if (!mediaCount)
      throw new BadRequestException('Upload at least one venue photograph before submission');
    return this.db.$transaction(async (tx) => {
      const submitted = await tx.venue.updateMany({
        where: { id, status: { in: ['DRAFT', 'REJECTED'] } },
        data: { status: 'PENDING', rejectionReason: null },
      });
      if (!submitted.count)
        throw new ConflictException('Listing status changed; refresh and try again');
      return tx.venue.findUnique({ where: { id }, include: venueRelations });
    });
  }
  mine(user: SessionUser) {
    return this.db.venue.findMany({
      where: { ownerId: user.id, deletedAt: null },
      include: venueRelations,
      orderBy: { createdAt: 'desc' },
    });
  }
  async mineDetail(id: string, user: SessionUser) {
    await this.owned(id, user);
    return this.db.venue.findUnique({ where: { id }, include: venueRelations });
  }
  async publicDetail(id: string) {
    const venue = await this.db.venue.findFirst({
      where: {
        id,
        status: 'APPROVED',
        deletedAt: null,
        owner: { status: 'ACTIVE', deletedAt: null },
        OR: [
          { organizationId: null },
          { organization: { status: { notIn: ['SUSPENDED', 'REJECTED'] }, deletedAt: null } },
        ],
      },
      include: venueRelations,
    });
    if (!venue) throw new NotFoundException('Venue is unavailable');
    await this.db.venue.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return venue;
  }
  async search(input: SearchInput) {
    const filters: Prisma.Sql[] = [
      Prisma.sql`v."status" = 'APPROVED'`,
      Prisma.sql`v."deletedAt" IS NULL`,
      Prisma.sql`EXISTS (SELECT 1 FROM "User" u WHERE u.id=v."ownerId" AND u.status='ACTIVE' AND u."deletedAt" IS NULL)`,
      Prisma.sql`(v."organizationId" IS NULL OR EXISTS (SELECT 1 FROM "Organization" o WHERE o.id=v."organizationId" AND o.status NOT IN ('SUSPENDED','REJECTED') AND o."deletedAt" IS NULL))`,
    ];
    if (input.city) filters.push(Prisma.sql`LOWER(v.city)=LOWER(${input.city})`);
    if (input.q) {
      const q = `%${input.q.replace(/[\\%_]/g, '\\$&')}%`;
      filters.push(
        Prisma.sql`(v.name ILIKE ${q} OR v.locality ILIKE ${q} OR v.city ILIKE ${q} OR v.category ILIKE ${q} OR v.pincode ILIKE ${q})`,
      );
    }
    if (input.category) filters.push(Prisma.sql`v.category=${input.category}`);
    if (input.minPrice !== undefined)
      filters.push(Prisma.sql`v."rentalPricePaise">=${input.minPrice}`);
    if (input.maxPrice !== undefined)
      filters.push(Prisma.sql`v."rentalPricePaise"<=${input.maxPrice}`);
    if (input.minCapacity !== undefined)
      filters.push(Prisma.sql`v."seatingCapacity">=${input.minCapacity}`);
    if (input.diningCapacity !== undefined)
      filters.push(Prisma.sql`v."diningCapacity">=${input.diningCapacity}`);
    if (input.eventType) filters.push(Prisma.sql`${input.eventType}=ANY(v."eventTypes")`);
    if (input.amenities)
      for (const a of input.amenities.split(',').filter(Boolean))
        filters.push(Prisma.sql`${a}=ANY(v.amenities)`);
    if (input.eventDate) {
      const date = new Date(input.eventDate);
      // A date without a declaration remains unconfirmed, rather than unavailable.
      // Venue-wide closures take precedence; otherwise retain a venue when at
      // least one active space has not explicitly been marked unavailable.
      filters.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM "VenueAvailability" va WHERE va."venueId"=v.id AND va."spaceId" IS NULL AND va.date=${date}::date AND va.status='UNAVAILABLE')`,
      );
      filters.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "VenueSpace" s WHERE s."venueId"=v.id AND s."deletedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM "VenueAvailability" va WHERE va."venueId"=v.id AND va."spaceId"=s.id AND va.date=${date}::date AND va.status='UNAVAILABLE'))`,
      );
    }
    const point =
      input.latitude !== undefined
        ? Prisma.sql`ST_SetSRID(ST_MakePoint(${input.longitude},${input.latitude}),4326)::geography`
        : null;
    if (point) filters.push(Prisma.sql`ST_DWithin(v.location,${point},${input.radiusKm * 1000})`);
    const where = Prisma.join(filters, ' AND ');
    const order =
      input.sort === 'price_asc'
        ? Prisma.sql`v."rentalPricePaise" ASC, v.id`
        : input.sort === 'price_desc'
          ? Prisma.sql`v."rentalPricePaise" DESC, v.id`
          : input.sort === 'capacity'
            ? Prisma.sql`v."seatingCapacity" DESC, v.id`
            : input.sort === 'nearest' && point
              ? Prisma.sql`ST_Distance(v.location,${point}) ASC, v.id`
              : input.sort === 'recent'
                ? Prisma.sql`v."createdAt" DESC, v.id`
                : Prisma.sql`v.featured DESC, v."createdAt" DESC, v.id`;
    const [counts, ids] = await this.db.$transaction([
      this.db.$queryRaw<{ total: number }[]>(
        Prisma.sql`SELECT COUNT(*)::integer AS total FROM "Venue" v WHERE ${where}`,
      ),
      this.db.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT v.id FROM "Venue" v WHERE ${where} ORDER BY ${order} LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}`,
      ),
    ]);
    const venues = await this.db.venue.findMany({
      where: {
        id: { in: ids.map((i) => i.id) },
        status: 'APPROVED',
        deletedAt: null,
        owner: { status: 'ACTIVE', deletedAt: null },
        OR: [
          { organizationId: null },
          { organization: { status: { notIn: ['SUSPENDED', 'REJECTED'] }, deletedAt: null } },
        ],
      },
      include: venueRelations,
    });
    const orderMap = new Map(ids.map((v, i) => [v.id, i]));
    venues.sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!);
    return { items: venues, total: counts[0]?.total ?? 0, page: input.page, limit: input.limit };
  }
  async dashboard(user: SessionUser) {
    const venueWhere = { ownerId: user.id, deletedAt: null };
    const enquiryWhere = { venue: { ownerId: user.id } };
    const [
      totalVenues,
      activeListings,
      pendingApprovals,
      newEnquiries,
      scheduledSiteVisits,
      pendingQuotes,
      confirmedBookings,
      views,
    ] = await Promise.all([
      this.db.venue.count({ where: venueWhere }),
      this.db.venue.count({ where: { ...venueWhere, status: 'APPROVED' } }),
      this.db.venue.count({ where: { ...venueWhere, status: 'PENDING' } }),
      this.db.enquiry.count({ where: { ...enquiryWhere, status: 'NEW' } }),
      this.db.siteVisit.count({
        where: {
          enquiry: enquiryWhere,
          status: { in: ['PROPOSED', 'ACCEPTED'] },
          startsAt: { gte: new Date() },
        },
      }),
      this.db.enquiry.count({
        where: { ...enquiryWhere, status: { in: ['NEW', 'VIEWED', 'RESPONDED'] } },
      }),
      this.db.booking.count({ where: { venue: { ownerId: user.id }, status: 'CONFIRMED' } }),
      this.db.venue.aggregate({ where: venueWhere, _sum: { viewCount: true } }),
    ]);
    return {
      totalVenues,
      activeListings,
      pendingApprovals,
      newEnquiries,
      scheduledSiteVisits,
      pendingQuotes,
      confirmedBookings,
      venueViews: views._sum.viewCount ?? 0,
    };
  }
  async availability(id: string, month: string, user?: SessionUser) {
    if (user) await this.owned(id, user);
    else await this.publicDetail(id);
    const start = new Date(`${month}-01T00:00:00Z`),
      end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return {
      entries: await this.db.venueAvailability.findMany({
        where: { venueId: id, date: { gte: start, lt: end } },
        orderBy: { date: 'asc' },
      }),
      bookings: await this.db.booking.findMany({
        where: { venueId: id, status: 'CONFIRMED', startsAt: { lt: end }, endsAt: { gt: start } },
        select: { spaceId: true, startsAt: true, endsAt: true },
      }),
      defaultStatus: 'NOT_CONFIRMED',
    };
  }
  async addSpace(
    id: string,
    input: z.infer<typeof import('./schemas').spaceSchema>,
    user: SessionUser,
  ) {
    const venue = await this.owned(id, user);
    if (venue.status === 'SUSPENDED')
      throw new ForbiddenException('Suspended venues cannot be edited');
    return this.db.$transaction(async (tx) => {
      const editable = await tx.venue.updateMany({
        where: { id, status: { not: 'SUSPENDED' } },
        data: { status: 'DRAFT' },
      });
      if (!editable.count) throw new ForbiddenException('Suspended venues cannot be edited');
      return tx.venueSpace.create({
        data: {
          ...input,
          venueId: id,
          diningCapacity: input.diningCapacity ?? venue.diningCapacity,
          rentalPricePaise: input.rentalPricePaise ?? venue.rentalPricePaise,
          amenities: input.amenities ?? venue.amenities,
        },
      });
    });
  }
  async setAvailability(
    spaceId: string,
    input: {
      date: string;
      status: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | 'NOT_CONFIRMED';
      notes?: string;
    },
    user: SessionUser,
  ) {
    const space = await this.db.venueSpace.findFirst({ where: { id: spaceId, deletedAt: null } });
    if (!space) throw new NotFoundException('Space not found');
    const venue = await this.owned(space.venueId, user);
    if (venue.status === 'SUSPENDED')
      throw new ForbiddenException('Suspended venues cannot be edited');
    return this.db.$transaction(async (tx) => {
      // Serialize availability edits with moderation of the parent venue.
      const editable = await tx.venue.updateMany({
        where: { id: space.venueId, status: { not: 'SUSPENDED' }, deletedAt: null },
        data: { updatedAt: new Date() },
      });
      if (!editable.count) throw new ForbiddenException('Suspended venues cannot be edited');
      return tx.venueAvailability.upsert({
        where: {
          venueId_spaceId_date: { venueId: space.venueId, spaceId, date: new Date(input.date) },
        },
        create: {
          venueId: space.venueId,
          spaceId,
          date: new Date(input.date),
          status: input.status,
          note: input.notes,
        },
        update: { status: input.status, note: input.notes },
      });
    });
  }
}

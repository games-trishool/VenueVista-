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
import { AuthService, SessionUser } from './auth';
import { databaseErrorCode, PrismaService } from './prisma.service';
import { VenueService, venueRelations } from './venue.service';
import { enquirySchema, quoteSchema } from './schemas';

const enquiryRelations = {
  venue: { include: { media: { orderBy: { sortOrder: 'asc' } } } },
  space: true,
  user: { select: { id: true, displayName: true } },
  messages: {
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { displayName: true, role: true } } },
  },
  quotes: { orderBy: { createdAt: 'desc' } },
  siteVisits: { orderBy: { startsAt: 'asc' } },
  booking: true,
} satisfies Prisma.EnquiryInclude;
const terminal = ['CONFIRMED', 'CANCELLED', 'CLOSED'];

@Injectable()
export class MarketService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(VenueService) private readonly venues: VenueService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  async scope(id: string, user: SessionUser, ownerOnly = false) {
    const enquiry = await this.db.enquiry.findUnique({
      where: { id },
      include: { venue: true, user: { select: { id: true, displayName: true } } },
    });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    if (
      ownerOnly
        ? user.role !== 'OWNER' || enquiry.venue.ownerId !== user.id
        : enquiry.userId !== user.id && enquiry.venue.ownerId !== user.id && user.role !== 'ADMIN'
    )
      throw new ForbiddenException('This enquiry belongs to another account');
    return enquiry;
  }
  private async locked(
    tx: Prisma.TransactionClient,
    id: string,
    user: SessionUser,
    ownerOnly = false,
  ) {
    await tx.$queryRaw`SELECT id FROM "Enquiry" WHERE id=${id}::uuid FOR UPDATE`;
    const enquiry = await tx.enquiry.findUnique({ where: { id }, include: { venue: true } });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    if (
      ownerOnly
        ? user.role !== 'OWNER' || enquiry.venue.ownerId !== user.id
        : enquiry.userId !== user.id && enquiry.venue.ownerId !== user.id && user.role !== 'ADMIN'
    )
      throw new ForbiddenException('This enquiry belongs to another account');
    if (terminal.includes(enquiry.status)) throw new ConflictException('This enquiry is closed');
    return enquiry;
  }
  async create(
    input: z.infer<typeof enquirySchema>,
    user: SessionUser,
  ): Promise<Prisma.EnquiryGetPayload<{ include: typeof enquiryRelations }> | null> {
    const prior = await this.db.enquiry.findUnique({
      where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: input.idempotencyKey } },
    });
    if (prior) {
      if (
        prior.venueId !== input.venueId ||
        prior.eventDate.toISOString().slice(0, 10) !== input.eventDate ||
        prior.guestCount !== input.guestCount ||
        prior.eventType !== input.eventType ||
        prior.spaceId !== (input.spaceId ?? null) ||
        prior.budgetPaise !== (input.budgetPaise ?? null) ||
        prior.requirements !== input.requirements
      )
        throw new ConflictException('This submission key was already used for a different enquiry');
      return this.detail(prior.id, user);
    }
    const venue = await this.venues.publicDetail(input.venueId);
    if (input.spaceId && !venue.spaces.some((s) => s.id === input.spaceId))
      throw new BadRequestException('Selected space does not belong to the venue');
    const selectedSpace = venue.spaces.find((s) => s.id === input.spaceId);
    if (
      input.guestCount >
      Math.max(
        selectedSpace?.seatingCapacity ?? venue.seatingCapacity,
        selectedSpace?.standingCapacity ?? venue.standingCapacity,
      )
    )
      throw new BadRequestException('Guest count exceeds venue capacity');
    try {
      const enquiry = await this.db.$transaction(async (tx) => {
        const created = await tx.enquiry.create({
          data: { ...input, eventDate: new Date(input.eventDate), userId: user.id },
        });
        await tx.notification.create({
          data: {
            userId: venue.ownerId,
            title: 'New venue enquiry',
            body: `${user.displayName} enquired about ${venue.name}`,
            data: { enquiryId: created.id, venueId: venue.id },
          },
        });
        return created;
      });
      return this.detail(enquiry.id, user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.db.enquiry.findUnique({
          where: {
            userId_idempotencyKey: { userId: user.id, idempotencyKey: input.idempotencyKey },
          },
        });
        if (existing) return this.create(input, user);
      }
      throw error;
    }
  }
  list(user: SessionUser) {
    return this.db.enquiry.findMany({
      where:
        user.role === 'ADMIN'
          ? {}
          : user.role === 'OWNER'
            ? { venue: { ownerId: user.id } }
            : { userId: user.id },
      include: enquiryRelations,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async detail(id: string, user: SessionUser) {
    await this.scope(id, user);
    return this.db.enquiry.findUnique({ where: { id }, include: enquiryRelations });
  }
  async message(id: string, body: string, user: SessionUser) {
    return this.db.$transaction(async (tx) => {
      const enquiry = await this.locked(tx, id, user);
      const message = await tx.enquiryMessage.create({
        data: { enquiryId: id, authorId: user.id, body },
      });
      const recipient = user.id === enquiry.userId ? enquiry.venue.ownerId : enquiry.userId;
      await tx.notification.create({
        data: {
          userId: recipient,
          title: 'Enquiry response',
          body: `A new response for ${enquiry.venue.name}`,
          data: { enquiryId: id },
        },
      });
      return message;
    });
  }
  async quote(id: string, input: z.infer<typeof quoteSchema>, user: SessionUser) {
    if (input.validUntil && new Date(input.validUntil) <= new Date())
      throw new BadRequestException('Quote expiry must be in the future');
    return this.db.$transaction(async (tx) => {
      const enquiry = await this.locked(tx, id, user, true);
      const quote = await tx.quote.create({
        data: {
          ...input,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
          enquiryId: id,
          authorId: user.id,
        },
      });
      await tx.enquiry.update({ where: { id }, data: { status: 'QUOTE_SENT' } });
      await tx.notification.create({
        data: {
          userId: enquiry.userId,
          title: 'Your venue quotation is ready',
          body: `${enquiry.venue.name} sent a quotation`,
          data: { enquiryId: id, quoteId: quote.id },
        },
      });
      return quote;
    });
  }
  async acceptQuote(id: string, quoteId: string, user: SessionUser) {
    return this.db.$transaction(async (tx) => {
      const enquiry = await this.locked(tx, id, user);
      if (enquiry.userId !== user.id)
        throw new ForbiddenException('Only the customer can accept a quotation');
      const quote = await tx.quote.findFirst({ where: { id: quoteId, enquiryId: id } });
      if (!quote || (quote.validUntil && quote.validUntil < new Date()))
        throw new BadRequestException('Quotation is missing or expired');
      await tx.quote.updateMany({ where: { enquiryId: id }, data: { acceptedAt: null } });
      const accepted = await tx.quote.update({
        where: { id: quoteId },
        data: { acceptedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: enquiry.venue.ownerId,
          title: 'Quotation accepted',
          body: 'The customer accepted your quotation. Confirm the space and dates to create a booking.',
          data: { enquiryId: id, quoteId },
        },
      });
      return accepted;
    });
  }
  async visit(id: string, input: { scheduledAt: string; notes?: string }, user: SessionUser) {
    const startsAt = new Date(input.scheduledAt);
    if (startsAt <= new Date()) throw new BadRequestException('Site visit must be in the future');
    return this.db.$transaction(async (tx) => {
      const enquiry = await this.locked(tx, id, user, true);
      const visit = await tx.siteVisit.create({
        data: { enquiryId: id, startsAt, note: input.notes },
      });
      await tx.enquiry.update({ where: { id }, data: { status: 'SITE_VISIT_SCHEDULED' } });
      await tx.notification.create({
        data: {
          userId: enquiry.userId,
          title: 'Site visit proposed',
          body: `${enquiry.venue.name} proposed a site visit`,
          data: { enquiryId: id, siteVisitId: visit.id },
        },
      });
      return visit;
    });
  }
  async status(
    id: string,
    status: 'VIEWED' | 'RESPONDED' | 'NEGOTIATING' | 'CANCELLED' | 'CLOSED',
    user: SessionUser,
  ) {
    if (user.role === 'CUSTOMER' && status !== 'CANCELLED')
      throw new ForbiddenException('Customers can only cancel an enquiry');
    return this.db.$transaction(async (tx) => {
      const enquiry = await this.locked(tx, id, user);
      if (status === 'VIEWED' && enquiry.status !== 'NEW')
        throw new ConflictException('Enquiry has already been viewed');
      if (status === 'RESPONDED' && enquiry.status !== 'NEW' && enquiry.status !== 'VIEWED')
        throw new ConflictException('Use messages to continue this enquiry');
      return tx.enquiry.update({ where: { id }, data: { status } });
    });
  }
  async confirm(
    id: string,
    input: {
      spaceId: string;
      quoteId: string;
      startsAt: string;
      endsAt: string;
      confirmation: true;
    },
    user: SessionUser,
  ) {
    const startsAt = new Date(input.startsAt),
      endsAt = new Date(input.endsAt);
    if (startsAt >= endsAt || startsAt < new Date())
      throw new BadRequestException('Booking times are invalid');
    const eventDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
      startsAt,
    );
    try {
      return await this.db.$transaction(async (tx) => {
        const enquiry = await this.locked(tx, id, user, true);
        const quote = await tx.quote.findFirst({
          where: { id: input.quoteId, enquiryId: id, acceptedAt: { not: null } },
        });
        if (!quote || (quote.validUntil && quote.validUntil < new Date()))
          throw new BadRequestException('The customer must accept a valid quotation first');
        if (eventDate !== enquiry.eventDate.toISOString().slice(0, 10))
          throw new BadRequestException('Booking must start on the requested event date in India');
        const space = await tx.venueSpace.findFirst({
          where: { id: input.spaceId, venueId: enquiry.venueId, deletedAt: null },
        });
        if (!space || (enquiry.spaceId && enquiry.spaceId !== space.id))
          throw new BadRequestException('Invalid venue space');
        const unavailable = await tx.venueAvailability.count({
          where: {
            venueId: enquiry.venueId,
            OR: [{ spaceId: null }, { spaceId: space.id }],
            date: {
              gte: new Date(eventDate),
              lte: new Date(
                new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(endsAt),
              ),
            },
            status: 'UNAVAILABLE',
          },
        });
        const blocked = await tx.venueBlock.count({
          where: {
            venueId: enquiry.venueId,
            OR: [{ spaceId: null }, { spaceId: space.id }],
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
            tentative: false,
          },
        });
        if (unavailable || blocked)
          throw new ConflictException('This space is blocked during the requested dates');
        const booking = await tx.booking.create({
          data: {
            enquiryId: id,
            venueId: enquiry.venueId,
            spaceId: space.id,
            userId: enquiry.userId,
            startsAt,
            endsAt,
          },
        });
        await tx.enquiry.update({
          where: { id },
          data: { status: 'CONFIRMED', spaceId: space.id },
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'BOOKING_CONFIRMED',
            entityType: 'Booking',
            entityId: booking.id,
            metadata: { enquiryId: id, quoteId: quote.id },
          },
        });
        await tx.notification.create({
          data: {
            userId: enquiry.userId,
            title: 'Booking confirmed',
            body: `Your booking at ${enquiry.venue.name} has been confirmed by the owner`,
            data: { enquiryId: id, bookingId: booking.id },
          },
        });
        return booking;
      });
    } catch (error) {
      if (
        databaseErrorCode(error) === '23P01' ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2002', 'P2004', 'P2010'].includes(error.code))
      )
        throw new ConflictException(
          'This space already has a confirmed booking during the requested times',
        );
      throw error;
    }
  }
  async wishlist(user: SessionUser) {
    const items = await this.db.wishlist.findMany({
      where: {
        userId: user.id,
        venue: {
          status: 'APPROVED',
          deletedAt: null,
          owner: { status: 'ACTIVE', deletedAt: null },
          OR: [
            { organizationId: null },
            { organization: { status: { notIn: ['SUSPENDED', 'REJECTED'] }, deletedAt: null } },
          ],
        },
      },
      include: { venue: { include: venueRelations } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((x) => x.venue);
  }
  async save(venueId: string, user: SessionUser) {
    await this.venues.publicDetail(venueId);
    return this.db.wishlist.upsert({
      where: { userId_venueId: { userId: user.id, venueId } },
      update: {},
      create: { userId: user.id, venueId },
    });
  }
  async unsave(venueId: string, user: SessionUser) {
    await this.db.wishlist.deleteMany({ where: { userId: user.id, venueId } });
    return { removed: true };
  }
  organizations(user: SessionUser) {
    return this.db.organization.findMany({
      where: { ownerId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
  async organization(input: { name: string; phone?: string; address?: string }, user: SessionUser) {
    return this.db.$transaction(async (tx) => {
      const promoted =
        user.role === 'CUSTOMER'
          ? await tx.user.update({ where: { id: user.id }, data: { role: 'OWNER' } })
          : null;
      const org = await tx.organization.create({ data: { ...input, ownerId: user.id } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'OWNER_ORGANIZATION_CREATED',
          entityType: 'Organization',
          entityId: org.id,
        },
      });
      return { ...org, ...(promoted ? { session: this.auth.issue(promoted) } : {}) };
    });
  }
  notifications(user: SessionUser) {
    return this.db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async readNotification(id: string, user: SessionUser) {
    const result = await this.db.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notification not found');
    return { read: true };
  }
  async deleteAccount(user: SessionUser) {
    const future = await this.db.booking.count({
      where: {
        OR: [{ userId: user.id }, { venue: { ownerId: user.id } }],
        status: 'CONFIRMED',
        endsAt: { gt: new Date() },
      },
    });
    if (future)
      throw new ConflictException(
        'Contact support to resolve future confirmed bookings before account deletion',
      );
    return this.db.$transaction(async (tx) => {
      await tx.venue.updateMany({ where: { ownerId: user.id }, data: { status: 'SUSPENDED' } });
      await tx.wishlist.deleteMany({ where: { userId: user.id } });
      await tx.userProfile.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          displayName: 'Deleted account',
          phone: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'ACCOUNT_DELETION_REQUESTED',
          entityType: 'User',
          entityId: user.id,
        },
      });
      return {
        deleted: true,
        retained:
          'Enquiry, audit and booking records retained according to the published retention policy; Firebase identity removal requires the configured identity service.',
      };
    });
  }
}

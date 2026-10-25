import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VenueStatus } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { SessionUser } from './auth';
import { venueRelations } from './venue.service';

export interface AdminListQuery {
  page: number;
  limit: number;
  q?: string;
  status?: string;
  role?: string;
}
@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async overview() {
    const [
      totalCustomers,
      totalOwners,
      totalVenues,
      pendingApprovals,
      activeListings,
      totalEnquiries,
      confirmedBookings,
    ] = await Promise.all([
      this.db.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
      this.db.user.count({ where: { role: 'OWNER', deletedAt: null } }),
      this.db.venue.count({ where: { deletedAt: null } }),
      this.db.venue.count({ where: { status: 'PENDING', deletedAt: null } }),
      this.db.venue.count({ where: { status: 'APPROVED', deletedAt: null } }),
      this.db.enquiry.count(),
      this.db.booking.count({ where: { status: 'CONFIRMED' } }),
    ]);
    return {
      totalCustomers,
      totalOwners,
      totalVenues,
      pendingApprovals,
      activeListings,
      totalEnquiries,
      confirmedBookings,
    };
  }
  async venues(query: AdminListQuery) {
    const where: Prisma.VenueWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status as VenueStatus } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { city: { contains: query.q, mode: 'insensitive' } },
              { locality: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.venue.findMany({
        where,
        include: {
          ...venueRelations,
          owner: { select: { id: true, displayName: true, phone: true } },
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.venue.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async venue(id: string) {
    const venue = await this.db.venue.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...venueRelations,
        owner: { select: { id: true, displayName: true, phone: true } },
        organization: true,
      },
    });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }
  async review(
    id: string,
    input: { decision: 'APPROVED' | 'REJECTED'; reason?: string },
    user: SessionUser,
  ) {
    const venue = await this.venue(id);
    if (venue.status !== 'PENDING')
      throw new ConflictException('Only pending listings can be reviewed');
    if (input.decision === 'REJECTED' && !input.reason?.trim())
      throw new BadRequestException('Give the owner a rejection reason');
    if (input.decision === 'APPROVED' && (!venue.media.length || !venue.spaces.length))
      throw new BadRequestException('A venue needs photographs and a bookable space');
    if (
      input.decision === 'APPROVED' &&
      (!venue.organization || venue.organization.status !== 'VERIFIED')
    )
      throw new BadRequestException(
        'Verify the owner business profile before approving this listing',
      );
    return this.db.$transaction(async (tx) => {
      const updated = await tx.venue.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: input.decision,
          rejectionReason: input.decision === 'REJECTED' ? input.reason : null,
        },
      });
      if (!updated.count) throw new ConflictException('This listing was already reviewed');
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: `VENUE_${input.decision}`,
          entityType: 'Venue',
          entityId: id,
          metadata: { reason: input.reason ?? null },
        },
      });
      await tx.notification.create({
        data: {
          userId: venue.ownerId,
          title: `Venue ${input.decision.toLowerCase()}`,
          body: input.reason ?? `${venue.name} is now visible to customers`,
          data: { venueId: id },
        },
      });
      return tx.venue.findUnique({ where: { id }, include: venueRelations });
    });
  }
  async suspend(id: string, reason: string, user: SessionUser) {
    await this.venue(id);
    return this.db.$transaction(async (tx) => {
      const venue = await tx.venue.update({
        where: { id },
        data: { status: 'SUSPENDED', rejectionReason: reason },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'VENUE_SUSPENDED',
          entityType: 'Venue',
          entityId: id,
          metadata: { reason },
        },
      });
      return venue;
    });
  }
  async feature(id: string, featured: boolean, user: SessionUser) {
    const venue = await this.venue(id);
    if (venue.status !== 'APPROVED')
      throw new BadRequestException('Only approved venues can be featured');
    return this.db.$transaction(async (tx) => {
      const updated = await tx.venue.update({ where: { id }, data: { featured } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'VENUE_FEATURE_CHANGED',
          entityType: 'Venue',
          entityId: id,
          metadata: { featured },
        },
      });
      return updated;
    });
  }
  async organizations(query: AdminListQuery) {
    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      ...(query.status
        ? { status: query.status as 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.organization.findMany({
        where,
        include: { owner: { select: { id: true, displayName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.organization.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async reviewOrganization(
    id: string,
    input: { decision: 'APPROVED' | 'REJECTED'; reason?: string },
    user: SessionUser,
  ) {
    const org = await this.db.organization.findFirst({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException('Business profile not found');
    if (input.decision === 'REJECTED' && !input.reason)
      throw new BadRequestException('A rejection reason is required');
    return this.db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: {
          status: input.decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED',
          reviewReason: input.reason,
        },
      });
      if (input.decision === 'REJECTED')
        await tx.venue.updateMany({ where: { organizationId: id }, data: { status: 'SUSPENDED' } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: `ORGANIZATION_${input.decision}`,
          entityType: 'Organization',
          entityId: id,
          metadata: { reason: input.reason ?? null },
        },
      });
      return updated;
    });
  }
  async users(query: AdminListQuery) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role as 'CUSTOMER' | 'OWNER' | 'ADMIN' } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          role: true,
          status: true,
          phone: true,
          createdAt: true,
          isDevelopment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.user.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async audit(query: AdminListQuery) {
    const [items, total] = await this.db.$transaction([
      this.db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.auditLog.count(),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
}

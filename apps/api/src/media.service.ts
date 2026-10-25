import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { VenueService } from './venue.service';
import { AuthService, SessionUser } from './auth';
import sharp from 'sharp';
import {
  createMediaStorage,
  MAX_MEDIA_BYTES,
  MediaStorage,
  StorageConfigurationError,
  StorageObjectNotFoundError,
} from './storage';

export function imageType(buffer: Buffer): { mime: string; extension: string } | null {
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mime: 'image/png', extension: 'png' };
  if (
    buffer.length >= 4 &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255 &&
    buffer[buffer.length - 2] === 255 &&
    buffer[buffer.length - 1] === 217
  )
    return { mime: 'image/jpeg', extension: 'jpg' };
  if (
    buffer.length >= 16 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return { mime: 'image/webp', extension: 'webp' };
  return null;
}
@Injectable()
export class MediaService {
  private mediaStorage?: MediaStorage;
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(VenueService) private readonly venues: VenueService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  storage() {
    try {
      return (this.mediaStorage ??= createMediaStorage());
    } catch (error) {
      if (error instanceof StorageConfigurationError) {
        console.error(
          JSON.stringify({
            level: 'error',
            event: 'media_storage_configuration_invalid',
            reason: error.message,
          }),
        );
        throw new ServiceUnavailableException(
          'Image storage is not configured. Please contact platform support.',
        );
      }
      throw new ServiceUnavailableException('Image storage is not available');
    }
  }
  onModuleDestroy() {
    this.mediaStorage?.close();
  }
  async upload(venueId: string, file: Express.Multer.File | undefined, user: SessionUser) {
    const venue = await this.venues.owned(venueId, user);
    if (venue.status === 'SUSPENDED')
      throw new ForbiddenException('Suspended venues cannot be edited');
    if (!file || !file.buffer?.length) throw new BadRequestException('Select an image file');
    if (file.size > MAX_MEDIA_BYTES)
      throw new BadRequestException('Image must be 8 MiB or smaller');
    const type = imageType(file.buffer);
    if (!type || file.mimetype !== type.mime)
      throw new BadRequestException('Only genuine JPEG, PNG and WebP image files are accepted');
    let sanitized: Buffer;
    try {
      sanitized = await sharp(file.buffer, { limitInputPixels: 30_000_000, failOn: 'warning' })
        .rotate()
        .toFormat(type.extension === 'jpg' ? 'jpeg' : (type.extension as 'png' | 'webp'))
        .toBuffer();
    } catch {
      throw new BadRequestException('Image data is invalid or too large to decode');
    }
    if (sanitized.length > MAX_MEDIA_BYTES)
      throw new BadRequestException('The decoded image must be 8 MiB or smaller');
    const count = await this.db.venueMedia.count({ where: { venueId } });
    if (count >= 30) throw new BadRequestException('A venue can have up to 30 photographs');
    const id = randomUUID(),
      storageKey = `${id}.${type.extension}`;
    const storage = this.storage();
    try {
      await storage.put(storageKey, sanitized, type.mime);
    } catch {
      throw new ServiceUnavailableException('Image storage is unavailable. Please try again.');
    }
    try {
      return await this.db.$transaction(async (tx) => {
        // Any changed public media returns the listing to moderation.
        const editable = await tx.venue.updateMany({
          where: { id: venueId, status: { not: 'SUSPENDED' } },
          data: { status: 'DRAFT' },
        });
        if (!editable.count) throw new ForbiddenException('Suspended venues cannot be edited');
        // The parent-row update serializes uploads for this venue. Recheck the
        // cap under that lock so concurrent requests cannot exceed it.
        const currentCount = await tx.venueMedia.count({ where: { venueId } });
        if (currentCount >= 30)
          throw new BadRequestException('A venue can have up to 30 photographs');
        return tx.venueMedia.create({
          data: {
            id,
            venueId,
            url: `${(process.env.PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')}/api/v1/media/${id}`,
            storageKey,
            mimeType: type.mime,
            originalName: file.originalname
              .replace(/[\\/]/g, '')
              .split('')
              .filter((c) => c.charCodeAt(0) >= 32)
              .join('')
              .slice(0, 200),
            isCover: currentCount === 0,
            sortOrder: currentCount,
          },
        });
      });
    } catch (error) {
      await storage
        .remove(storageKey)
        .catch(() =>
          console.error(
            JSON.stringify({ level: 'error', event: 'media_orphan_cleanup_failed', mediaId: id }),
          ),
        );
      throw error;
    }
  }
  async file(id: string, authorization?: string) {
    const media = await this.db.venueMedia.findUnique({
      where: { id },
      include: {
        venue: {
          include: {
            owner: { select: { status: true, deletedAt: true } },
            organization: { select: { status: true, deletedAt: true } },
          },
        },
      },
    });
    if (
      !media ||
      !media.storageKey ||
      media.venue.deletedAt ||
      media.venue.owner.deletedAt ||
      media.venue.owner.status !== 'ACTIVE'
    )
      throw new NotFoundException('Image not found');
    const isPublic =
      media.venue.status === 'APPROVED' &&
      (!media.venue.organization ||
        (!media.venue.organization.deletedAt &&
          !['SUSPENDED', 'REJECTED'].includes(media.venue.organization.status)));
    if (!isPublic) {
      const token = authorization?.match(/^Bearer (\S+)$/)?.[1];
      if (!token) throw new ForbiddenException('This image belongs to an unpublished listing');
      const user = await this.auth.verifyToken(token);
      if (user.role !== 'ADMIN' && user.id !== media.venue.ownerId)
        throw new ForbiddenException('This image belongs to another owner');
    }
    // Keys come from server-generated UUIDs, never user paths.
    if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(media.storageKey))
      throw new NotFoundException('Image not found');
    const buffer = await this.storage()
      .read(media.storageKey)
      .catch((error: unknown) => {
        if (error instanceof StorageObjectNotFoundError || error instanceof TypeError)
          throw new NotFoundException('Image file not found');
        throw new ServiceUnavailableException('Image storage is unavailable. Please try again.');
      });
    return { buffer, mime: media.mimeType, public: isPublic };
  }
  async remove(venueId: string, id: string, user: SessionUser) {
    const venue = await this.venues.owned(venueId, user);
    if (venue.status === 'SUSPENDED')
      throw new ForbiddenException('Suspended venues cannot be edited');
    const media = await this.db.venueMedia.findFirst({ where: { id, venueId } });
    if (!media) throw new NotFoundException('Image not found');
    const storage = this.storage();
    await this.db.$transaction(async (tx) => {
      const editable = await tx.venue.updateMany({
        where: { id: venueId, status: { not: 'SUSPENDED' } },
        data: { status: 'DRAFT' },
      });
      if (!editable.count) throw new ForbiddenException('Suspended venues cannot be edited');
      await tx.venueMedia.delete({ where: { id } });
    });
    let storageCleanupPending = false;
    if (media.storageKey && /^[a-f0-9-]+\.(png|jpg|webp)$/.test(media.storageKey)) {
      await storage.remove(media.storageKey).catch(() => {
        storageCleanupPending = true;
        console.error(
          JSON.stringify({ level: 'error', event: 'media_orphan_cleanup_failed', mediaId: id }),
        );
      });
    }
    return { removed: true, storageCleanupPending };
  }
}

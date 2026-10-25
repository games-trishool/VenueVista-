import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { z } from 'zod';
import { AuthService, Public, Roles, SessionRequest } from './auth';
import { PrismaService } from './prisma.service';
import { VenueService } from './venue.service';
import { MarketService } from './market.service';
import { AdminService } from './admin.service';
import { MediaService } from './media.service';
import {
  categories,
  dateOnly,
  enquirySchema,
  parse,
  quoteSchema,
  searchSchema,
  spaceSchema,
  text,
  uuid,
  venueSchema,
} from './schemas';
import { launchLocations } from './locations';

const idPipe = new ParseUUIDPipe();
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const reviewSchema = z
  .object({ decision: z.enum(['APPROVED', 'REJECTED']), reason: text(2000).optional() })
  .strict();

@ApiTags('Health and locations')
@Controller()
export class PublicController {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(VenueService) private readonly venues: VenueService,
  ) {}
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Verify API, PostgreSQL and PostGIS readiness' })
  async health() {
    const result = await this.db.$queryRaw<
      { version: string }[]
    >`SELECT PostGIS_Version() AS version`;
    return { status: 'ok', database: 'ok', postgis: result[0]?.version };
  }
  @Public()
  @Get('locations')
  async locations() {
    const saved = await this.db.platformSetting.findUnique({ where: { key: 'locations' } });
    return saved?.value ?? launchLocations;
  }
  @Public()
  @Get('categories')
  categories() {
    return categories.map((id) => ({
      id,
      name: id
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }
  @Public()
  @Get('venues')
  @ApiOperation({
    summary:
      'Discover approved venues with indexed location, distance and attribute filters; monetary values are paise',
  })
  search(@Query() query: unknown) {
    return this.venues.search(parse(searchSchema, query));
  }
  @Public()
  @Get('venues/:id')
  detail(@Param('id', idPipe) id: string) {
    return this.venues.publicDetail(id);
  }
  @Public()
  @Get('venues/:id/availability')
  availability(@Param('id', idPipe) id: string, @Query('month') month: unknown) {
    return this.venues.availability(id, parse(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), month));
  }
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Public()
  @Post('dev-session')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @ApiOperation({
    summary: 'Development-only session for a fixed seeded actor; forbidden in production',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['persona'],
      properties: { persona: { type: 'string', enum: ['owner', 'customer', 'admin'] } },
    },
  })
  dev(@Body() body: unknown) {
    return this.auth.devSession(
      parse(z.object({ persona: z.enum(['owner', 'customer', 'admin']) }).strict(), body).persona,
    );
  }
  @Public()
  @Post('firebase')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBody({
    schema: { type: 'object', required: ['idToken'], properties: { idToken: { type: 'string' } } },
  })
  firebase(@Body() body: unknown) {
    return this.auth.firebaseSession(
      parse(z.object({ idToken: text(16000) }).strict(), body).idToken,
    );
  }
}

@ApiTags('Accounts and organizations')
@ApiBearerAuth()
@Controller()
export class AccountController {
  constructor(@Inject(MarketService) private readonly market: MarketService) {}
  @Get('me') me(@Req() req: SessionRequest) {
    return req.user;
  }
  @Delete('me') delete(@Req() req: SessionRequest) {
    return this.market.deleteAccount(req.user);
  }
  @Roles('CUSTOMER', 'OWNER') @Get('organizations') organizations(@Req() req: SessionRequest) {
    return this.market.organizations(req.user);
  }
  @Roles('CUSTOMER', 'OWNER')
  @Post('organizations')
  organization(@Body() body: unknown, @Req() req: SessionRequest) {
    return this.market.organization(
      parse(
        z
          .object({
            name: text(200),
            phone: z
              .string()
              .regex(/^\+91[6-9]\d{9}$/)
              .optional(),
            address: text(1000).optional(),
          })
          .strict(),
        body,
      ),
      req.user,
    );
  }
  @Get('notifications') notifications(@Req() req: SessionRequest) {
    return this.market.notifications(req.user);
  }
  @Put('notifications/:id/read') read(@Param('id', idPipe) id: string, @Req() req: SessionRequest) {
    return this.market.readNotification(id, req.user);
  }
}

@ApiTags('Partner venues')
@ApiBearerAuth()
@Roles('OWNER')
@Controller('partner')
export class PartnerController {
  constructor(
    @Inject(VenueService) private readonly venues: VenueService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}
  @Get('dashboard') dashboard(@Req() req: SessionRequest) {
    return this.venues.dashboard(req.user);
  }
  @Get('venues') mine(@Req() req: SessionRequest) {
    return this.venues.mine(req.user);
  }
  @Get('venues/:id') detail(@Param('id', idPipe) id: string, @Req() req: SessionRequest) {
    return this.venues.mineDetail(id, req.user);
  }
  @Get('venues/:id/availability') availabilityForOwner(
    @Param('id', idPipe) id: string,
    @Query('month') month: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.venues.availability(
      id,
      parse(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), month),
      req.user,
    );
  }
  @Post('venues')
  @ApiOperation({
    summary: 'Create a draft listing; owner ID and publication status are assigned by the server',
  })
  create(@Body() body: unknown, @Req() req: SessionRequest) {
    return this.venues.create(parse(venueSchema, body), req.user);
  }
  @Patch('venues/:id')
  update(@Param('id', idPipe) id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    return this.venues.update(id, parse(venueSchema.partial(), body), req.user);
  }
  @Post('venues/:id/submit') submit(@Param('id', idPipe) id: string, @Req() req: SessionRequest) {
    return this.venues.submit(id, req.user);
  }
  @Post('venues/:id/spaces') space(
    @Param('id', idPipe) id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.venues.addSpace(id, parse(spaceSchema, body), req.user);
  }
  @Put('spaces/:id/availability')
  availability(@Param('id', idPipe) id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    return this.venues.setAvailability(
      id,
      parse(
        z
          .object({
            date: dateOnly,
            status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'TENTATIVE', 'NOT_CONFIRMED']),
            notes: text(1000).optional(),
          })
          .strict(),
        body,
      ),
      req.user,
    );
  }
  @Post('venues/:id/media')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 } }),
  )
  upload(
    @Param('id', idPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: SessionRequest,
  ) {
    return this.media.upload(id, file, req.user);
  }
  @Delete('venues/:id/media/:mediaId')
  remove(
    @Param('id', idPipe) id: string,
    @Param('mediaId', idPipe) mediaId: string,
    @Req() req: SessionRequest,
  ) {
    return this.media.remove(id, mediaId, req.user);
  }
}

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}
  @Public()
  @Get(':id')
  async file(
    @Param('id', idPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.media.file(id, authorization);
    res
      .type(result.mime)
      .setHeader('X-Content-Type-Options', 'nosniff')
      .setHeader('Content-Disposition', 'inline')
      .setHeader('Cache-Control', result.public ? 'public, max-age=300' : 'private, no-store')
      .send(result.buffer);
  }
}

@ApiTags('Wishlists')
@ApiBearerAuth()
@Roles('CUSTOMER')
@Controller('wishlist')
export class WishlistController {
  constructor(@Inject(MarketService) private readonly market: MarketService) {}
  @Get() list(@Req() req: SessionRequest) {
    return this.market.wishlist(req.user);
  }
  @Put(':id') save(@Param('id', idPipe) id: string, @Req() req: SessionRequest) {
    return this.market.save(id, req.user);
  }
  @Delete(':id') unsave(@Param('id', idPipe) id: string, @Req() req: SessionRequest) {
    return this.market.unsave(id, req.user);
  }
}

@ApiTags('Enquiries, quotes and bookings')
@ApiBearerAuth()
@Controller('enquiries')
export class EnquiryController {
  constructor(@Inject(MarketService) private readonly market: MarketService) {}
  @Roles('CUSTOMER')
  @Post()
  @ApiOperation({
    summary: 'Create an enquiry and owner notification atomically; reuse idempotencyKey on retries',
  })
  create(@Body() body: unknown, @Req() req: SessionRequest) {
    return this.market.create(parse(enquirySchema, body), req.user);
  }
  @Get() list(@Req() req: SessionRequest) {
    return this.market.list(req.user);
  }
  @Get(':id') detail(@Param('id', idPipe) id: string, @Req() req: SessionRequest) {
    return this.market.detail(id, req.user);
  }
  @Post(':id/messages') message(
    @Param('id', idPipe) id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.market.message(
      id,
      parse(z.object({ body: text(4000) }).strict(), body).body,
      req.user,
    );
  }
  @Roles('OWNER')
  @Post(':id/quotes')
  quote(@Param('id', idPipe) id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    return this.market.quote(id, parse(quoteSchema, body), req.user);
  }
  @Roles('CUSTOMER')
  @Post(':id/quotes/:quoteId/accept')
  accept(
    @Param('id', idPipe) id: string,
    @Param('quoteId', idPipe) quoteId: string,
    @Req() req: SessionRequest,
  ) {
    return this.market.acceptQuote(id, quoteId, req.user);
  }
  @Roles('OWNER')
  @Post(':id/site-visits')
  visit(@Param('id', idPipe) id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    return this.market.visit(
      id,
      parse(
        z
          .object({
            scheduledAt: z.string().datetime({ offset: true }),
            notes: text(2000).optional(),
          })
          .strict(),
        body,
      ),
      req.user,
    );
  }
  @Post(':id/status')
  status(@Param('id', idPipe) id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    return this.market.status(
      id,
      parse(
        z
          .object({ status: z.enum(['VIEWED', 'RESPONDED', 'NEGOTIATING', 'CANCELLED', 'CLOSED']) })
          .strict(),
        body,
      ).status,
      req.user,
    );
  }
  @Roles('OWNER')
  @Post(':id/confirm')
  @ApiOperation({
    summary:
      'Explicitly confirm an accepted quotation; database exclusion constraint prevents overlapping bookings',
  })
  confirm(@Param('id', idPipe) id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    return this.market.confirm(
      id,
      parse(
        z
          .object({
            spaceId: uuid,
            quoteId: uuid,
            startsAt: z.string().datetime({ offset: true }),
            endsAt: z.string().datetime({ offset: true }),
            confirmation: z.literal(true),
          })
          .strict(),
        body,
      ),
      req.user,
    );
  }
}

@ApiTags('Administration')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly admin: AdminService,
    @Inject(PrismaService) private readonly db: PrismaService,
  ) {}
  @Get('overview') overview() {
    return this.admin.overview();
  }
  @Get('venues') venues(@Query() query: unknown) {
    return this.admin.venues(
      parse(
        pageQuery
          .extend({
            status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
            q: z.string().trim().max(200).optional(),
          })
          .strict(),
        query,
      ),
    );
  }
  @Get('venues/:id') venue(@Param('id', idPipe) id: string) {
    return this.admin.venue(id);
  }
  @Post('venues/:id/review') review(
    @Param('id', idPipe) id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.admin.review(id, parse(reviewSchema, body), req.user);
  }
  @Post('venues/:id/suspend') suspend(
    @Param('id', idPipe) id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.admin.suspend(
      id,
      parse(z.object({ reason: text(2000) }).strict(), body).reason,
      req.user,
    );
  }
  @Post('venues/:id/feature') feature(
    @Param('id', idPipe) id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.admin.feature(
      id,
      parse(z.object({ featured: z.boolean() }).strict(), body).featured,
      req.user,
    );
  }
  @Get('organizations') organizations(@Query() query: unknown) {
    return this.admin.organizations(
      parse(
        pageQuery
          .extend({ status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']).optional() })
          .strict(),
        query,
      ),
    );
  }
  @Post('organizations/:id/review') reviewOrganization(
    @Param('id', idPipe) id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.admin.reviewOrganization(id, parse(reviewSchema, body), req.user);
  }
  @Get('users') users(@Query() query: unknown) {
    return this.admin.users(
      parse(
        pageQuery.extend({ role: z.enum(['CUSTOMER', 'OWNER', 'ADMIN']).optional() }).strict(),
        query,
      ),
    );
  }
  @Get('audit') audit(@Query() query: unknown) {
    return this.admin.audit(parse(pageQuery.strict(), query));
  }
  @Put('settings/locations')
  async locations(@Body() body: unknown, @Req() req: SessionRequest) {
    const value = parse(
      z
        .array(
          z
            .object({
              id: text(100),
              name: text(100),
              state: text(100),
              latitude: z.number().min(-90).max(90),
              longitude: z.number().min(-180).max(180),
            })
            .strict(),
        )
        .min(1)
        .max(1000),
      body,
    );
    return this.db.$transaction(async (tx) => {
      const setting = await tx.platformSetting.upsert({
        where: { key: 'locations' },
        create: { key: 'locations', value },
        update: { value },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'LOCATIONS_UPDATED',
          entityType: 'PlatformSetting',
          entityId: setting.id,
        },
      });
      return setting;
    });
  }
}

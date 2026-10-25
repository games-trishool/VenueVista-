import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard, AuthService } from './auth';
import { PrismaService } from './prisma.service';
import { VenueService } from './venue.service';
import { MarketService } from './market.service';
import { AdminService } from './admin.service';
import { MediaService } from './media.service';
import {
  AccountController,
  AdminController,
  AuthController,
  EnquiryController,
  MediaController,
  PartnerController,
  PublicController,
  WishlistController,
} from './controllers';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 180 }])],
  controllers: [
    PublicController,
    AuthController,
    AccountController,
    PartnerController,
    MediaController,
    WishlistController,
    EnquiryController,
    AdminController,
  ],
  providers: [
    PrismaService,
    AuthService,
    VenueService,
    MarketService,
    AdminService,
    MediaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}

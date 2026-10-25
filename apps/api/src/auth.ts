import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, User } from '@prisma/client';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PrismaService } from './prisma.service';

export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export type SessionUser = Pick<User, 'id' | 'role' | 'displayName' | 'phone' | 'isDevelopment'>;
export interface SessionRequest {
  user: SessionUser;
  headers: Record<string, string | undefined>;
}
export function authSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('AUTH_JWT_SECRET must contain at least 32 characters');
  return secret;
}
export function devAuthEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_AUTH === 'true';
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  present(user: User): SessionUser {
    return {
      id: user.id,
      role: user.role,
      displayName: user.displayName,
      phone: user.phone,
      isDevelopment: user.isDevelopment,
    };
  }
  issue(user: User, adminMfa = false) {
    return {
      accessToken: sign({ role: user.role, adminMfa }, authSecret(), {
        algorithm: 'HS256',
        subject: user.id,
        expiresIn: '1h',
        issuer: 'venuevista',
        audience: 'venuevista-apps',
      }),
      user: this.present(user),
    };
  }
  async verifyToken(token: string): Promise<SessionUser> {
    try {
      const payload = verify(token, authSecret(), {
        algorithms: ['HS256'],
        issuer: 'venuevista',
        audience: 'venuevista-apps',
      }) as JwtPayload;
      if (!payload.sub) throw new Error('Missing subject');
      const user = await this.db.user.findUnique({ where: { id: payload.sub } });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.deletedAt ||
        (user.isDevelopment && !devAuthEnabled())
      )
        throw new Error('Inactive user');
      if (payload.role !== user.role) throw new Error('Role changed; reauthenticate');
      if (user.role === Role.ADMIN && !user.isDevelopment && payload.adminMfa !== true)
        throw new Error('Administrator MFA attestation is required');
      return this.present(user);
    } catch {
      throw new UnauthorizedException('Session expired or invalid');
    }
  }
  async devSession(persona: 'owner' | 'customer' | 'admin') {
    if (!devAuthEnabled()) throw new ForbiddenException('Development authentication is disabled');
    const roles = { owner: Role.OWNER, customer: Role.CUSTOMER, admin: Role.ADMIN };
    const user = await this.db.user.upsert({
      where: { firebaseUid: `dev:${persona}` },
      update: {},
      create: {
        firebaseUid: `dev:${persona}`,
        displayName: `Development ${persona}`,
        role: roles[persona],
        isDevelopment: true,
      },
    });
    if (user.status !== 'ACTIVE' || user.deletedAt)
      throw new ForbiddenException('Development account is inactive');
    return this.issue(user);
  }
  async firebaseSession(idToken: string) {
    if (!process.env.FIREBASE_PROJECT_ID)
      throw new ServiceUnavailableException('Phone authentication is not configured');
    try {
      const app =
        getApps()[0] ??
        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      const decoded = await getAuth(app).verifyIdToken(idToken, true);
      let user = await this.db.user.findUnique({ where: { firebaseUid: decoded.uid } });
      if (
        user?.role !== 'ADMIN' &&
        (!decoded.phone_number || decoded.firebase?.sign_in_provider !== 'phone')
      )
        throw new UnauthorizedException('A verified phone sign-in is required');
      if (
        user?.role === 'ADMIN' &&
        decoded.firebase?.sign_in_provider === 'password' &&
        !decoded.email_verified
      )
        throw new ForbiddenException('Administrator email verification is required');
      if (!user)
        user = await this.db.user.create({
          data: {
            firebaseUid: decoded.uid,
            phone: decoded.phone_number,
            displayName: decoded.name ?? 'VenueVista member',
            role: Role.CUSTOMER,
          },
        });
      if (user.status !== 'ACTIVE' || user.deletedAt)
        throw new ForbiddenException('Account is inactive');
      if (
        user.role === Role.ADMIN &&
        !(decoded.firebase as { sign_in_second_factor?: string })?.sign_in_second_factor
      )
        throw new ForbiddenException('Administrator multi-factor authentication is required');
      return this.issue(
        user,
        !!(decoded.firebase as { sign_in_second_factor?: string })?.sign_in_second_factor,
      );
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException)
        throw error;
      throw new UnauthorizedException('Phone authentication failed');
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('public', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const match = request.headers.authorization?.match(/^Bearer (\S+)$/);
    if (!match) throw new UnauthorizedException('Sign in to continue');
    request.user = await this.auth.verifyToken(match[1]);
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(request.user.role))
      throw new ForbiddenException('You do not have permission for this action');
    return true;
  }
}

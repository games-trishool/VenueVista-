import 'reflect-metadata';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { authSecret, devAuthEnabled } from './auth';
import { databaseErrorCode } from './prisma.service';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    let status = 500,
      body: unknown = { message: 'An unexpected error occurred' };
    if (error instanceof HttpException) {
      status = error.getStatus();
      body = error.getResponse();
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      status =
        error.code === 'P2025'
          ? 404
          : ['P2002', 'P2003', 'P2004', 'P2010'].includes(error.code)
            ? 409
            : 500;
      body = {
        message:
          status === 404
            ? 'Record not found'
            : status === 409
              ? 'This action conflicts with an existing record'
              : 'Database operation failed',
      };
    } else if (['23P01', '23505', '23503', '23514'].includes(databaseErrorCode(error) ?? '')) {
      status = 409;
      body = { message: 'This action conflicts with an existing record or constraint' };
    }
    if (status === 500)
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'request_failed',
          requestId: res.getHeader('X-Request-Id'),
          name: error instanceof Error ? error.name : 'UnknownError',
        }),
      );
    res.status(status).json({
      statusCode: status,
      error: typeof body === 'string' ? { message: body } : body,
      requestId: res.getHeader('X-Request-Id'),
      path: req.path,
    });
  }
}

export async function createApp() {
  authSecret();
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_AUTH === 'true')
    throw new Error('ENABLE_DEV_AUTH cannot be enabled in production');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.setGlobalPrefix('api/v1');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const origins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:8081,http://localhost:8082'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === 'production' && origins.some((s) => !s.startsWith('https://')))
    throw new Error('Production CORS origins must use HTTPS');
  app.enableCors({
    origin: origins,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID(),
      start = Date.now();
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () =>
      console.log(
        JSON.stringify({
          level: 'info',
          requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
        }),
      ),
    );
    next();
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  // Swagger is development-only. Production APIs remain protected by their route guards.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('VenueVista API')
      .setDescription(
        'Venue discovery and enquiry marketplace. All monetary values are integer INR paise. Development personas are synthetic accounts; no production venues are seeded.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  app.enableShutdownHooks();
  if (devAuthEnabled())
    console.warn(
      JSON.stringify({
        level: 'warn',
        event: 'development_auth_enabled',
        message: 'Fixed development personas are enabled. Never deploy this setting.',
      }),
    );
  return app;
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

export function databaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || !error) return undefined;
  const cause = (error as { cause?: unknown }).cause;
  if (
    typeof cause === 'object' &&
    cause &&
    'originalCode' in cause &&
    typeof cause.originalCode === 'string'
  )
    return cause.originalCode;
  return undefined;
}

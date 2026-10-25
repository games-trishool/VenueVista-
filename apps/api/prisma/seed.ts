/** Explicit development identities only. No fictional venues enter the catalogue. */
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_AUTH !== 'true') {
    throw new Error(
      'Development seeding requires ENABLE_DEV_AUTH=true and NODE_ENV other than production.',
    );
  }
  const personas = [
    { role: Role.OWNER, key: 'owner', displayName: 'Development Owner' },
    { role: Role.CUSTOMER, key: 'customer', displayName: 'Development Customer' },
    { role: Role.ADMIN, key: 'admin', displayName: 'Development Administrator' },
  ];
  for (const persona of personas) {
    await prisma.user.upsert({
      where: { firebaseUid: `dev:${persona.key}` },
      create: {
        firebaseUid: `dev:${persona.key}`,
        displayName: persona.displayName,
        role: persona.role,
        isDevelopment: true,
      },
      update: {},
    });
  }
  const owner = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: 'dev:owner' } });
  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-4000-a000-000000000001' },
    create: {
      id: '00000000-0000-4000-a000-000000000001',
      ownerId: owner.id,
      name: 'Development Venue Organization',
      status: 'VERIFIED',
    },
    update: {},
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: owner.id } },
    create: { organizationId: organization.id, userId: owner.id, role: 'OWNER' },
    update: {},
  });
  console.log(
    'Development identities and organization prepared. No venues, prices, ratings, reviews or availability were fabricated.',
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Database seed failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

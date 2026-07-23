/**
 * Seeds the fixed lab data: time slots, the bootstrap admin, and the component
 * inventory.
 *
 * Every write is an upsert keyed on a natural unique column, so running the seed
 * repeatedly is safe and never duplicates rows. Existing stock levels are left
 * alone — only new components are given their initial quantity.
 */
import { hash } from '@node-rs/argon2';
import { PrismaClient, Role } from '@prisma/client';

import { COMPONENTS, TIME_SLOTS } from './seed-data';

const prisma = new PrismaClient();

/** OWASP-recommended argon2id parameters. Mirrored in PasswordService. */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

async function seedTimeSlots(): Promise<void> {
  for (const slot of TIME_SLOTS) {
    await prisma.timeSlot.upsert({
      where: { label: slot.label },
      update: { startTime: slot.startTime, endTime: slot.endTime, sortOrder: slot.sortOrder },
      create: slot,
    });
  }
  console.log(`✓ ${TIME_SLOTS.length} time slots`);
}

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME ?? 'System Administrator';

  if (!email || !password) {
    console.warn('! SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin');
    return;
  }

  const passwordHash = await hash(password, ARGON2_OPTIONS);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    // Never reset an existing admin's password on re-seed.
    update: { role: Role.ADMIN, isActive: true },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ admin user ${email}`);
}

async function seedComponents(): Promise<void> {
  for (const component of COMPONENTS) {
    await prisma.component.upsert({
      where: { name: component.name },
      // Stock levels are operational data — a re-seed must not overwrite them.
      update: { sku: component.sku, description: component.description },
      create: component,
    });
  }
  console.log(`✓ ${COMPONENTS.length} components`);
}

async function main(): Promise<void> {
  console.log('Seeding database...');
  await seedTimeSlots();
  await seedAdmin();
  await seedComponents();
  console.log('Done.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

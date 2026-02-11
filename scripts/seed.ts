#!/usr/bin/env tsx

import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

const defaultVisitReasons = [
  { label: 'Meeting someone', sortOrder: 1 },
  { label: 'Coworking', sortOrder: 2 },
  { label: 'Attending an event', sortOrder: 3 },
  { label: 'Touring the space', sortOrder: 4 },
  { label: 'Delivery', sortOrder: 5 },
  { label: 'Interview', sortOrder: 6 },
  { label: 'Other', sortOrder: 7 },
];

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create visit reasons
    for (const reason of defaultVisitReasons) {
      const slug = reason.label.toLowerCase().replace(/\s+/g, '-');
      
      await prisma.visitReason.upsert({
        where: { slug },
        update: {
          label: reason.label,
          active: true,
          sortOrder: reason.sortOrder,
          source: 'MANUAL',
        },
        create: {
          label: reason.label,
          slug,
          active: true,
          sortOrder: reason.sortOrder,
          source: 'MANUAL',
        },
      });
      
      console.log(`✅ Created/updated visit reason: ${reason.label}`);
    }

    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if called directly
if (require.main === module) {
  seed();
}

#!/usr/bin/env tsx

import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

const defaultVisitReasons: Array<{
  label: string;
  sortOrder: number;
  category: 'EVENT' | 'VISIT' | 'OTHER' | null;
}> = [
  { label: 'Meeting someone', sortOrder: 1, category: null },
  { label: 'Coworking', sortOrder: 2, category: null },
  { label: 'Attending an event', sortOrder: 3, category: 'EVENT' },
  { label: 'Touring the space', sortOrder: 4, category: null },
  { label: 'Delivery', sortOrder: 5, category: null },
  { label: 'Interview', sortOrder: 6, category: null },
  { label: 'Other', sortOrder: 7, category: 'OTHER' },
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
          category: reason.category,
        },
        create: {
          label: reason.label,
          slug,
          active: true,
          sortOrder: reason.sortOrder,
          source: 'MANUAL',
          category: reason.category,
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

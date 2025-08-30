#!/usr/bin/env node

import seedAnalyticsPackages from './analyticsPackages.js';

console.log('🌱 Starting Analytics Package Seeder...\n');

try {
  await seedAnalyticsPackages();
  console.log('✅ Seeding completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
}
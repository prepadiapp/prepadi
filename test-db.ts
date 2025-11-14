// Create a test file: test-db.ts
import { prisma } from './lib/prisma';

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

main();
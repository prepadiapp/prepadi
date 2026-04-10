import { PrismaClient, UserRole, PlanInterval, PlanType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // --- 1. Seed Admin User ---
  const adminEmail = 'prepadiapp@gmail.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('waveprepmaster1', 12);
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        hashedPassword,
        role: UserRole.ADMIN,
        emailVerified: new Date(),
        isActive: true,
      },
    });
    console.log('👤 Created Admin User: admin@prepadi.com / Admin@123');
  } else {
    console.log('👤 Admin User already exists.');
  }

  // --- 2. Seed Plans ---
  const plans = [
    { 
      name: 'Free', 
      price: 0, 
      interval: PlanInterval.LIFETIME, 
      description: 'Basic access',
      type: PlanType.STUDENT 
    },
    { 
      name: 'Monthly Premium', 
      price: 2000, 
      interval: PlanInterval.MONTHLY, 
      description: 'Full access, No ads',
      type: PlanType.STUDENT 
    },
    { 
      name: 'Quarterly Premium', 
      price: 5000, 
      interval: PlanInterval.QUARTERLY, 
      description: 'Full access, No ads',
      type: PlanType.STUDENT 
    },
    { 
      name: 'Yearly Premium', 
      price: 15000, 
      interval: PlanInterval.YEARLY, 
      description: 'Full access, No ads',
      type: PlanType.STUDENT 
    },
  ];

  for (const plan of plans) {
    const existingPlan = await prisma.plan.findFirst({
      where: { name: plan.name, type: plan.type }
    });

    if (!existingPlan) {
      await prisma.plan.create({
        data: {
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
          description: plan.description,
          type: plan.type,
          features: [], 
          isActive: true
        },
      });
      console.log(`➕ Created Plan: ${plan.name}`);
    } else {
      console.log(`🔹 Plan already exists: ${plan.name}`);
    }
  }
  console.log('💳 Plans seeding checked.');

  // --- 3. Seed Exams with API Aliases ---
  const exams = [
    { 
      name: 'JAMB', 
      shortName: 'jamb', 
      description: 'Joint Admissions and Matriculation Board',
      apiAliases: { qboard: 'utme' } // Qboard uses 'utme'
    },
    { 
      name: 'WAEC', 
      shortName: 'waec', 
      description: 'West African Senior School Certificate Examination',
      apiAliases: { qboard: 'waec' }
    },
    { 
      name: 'NECO', 
      shortName: 'neco', 
      description: 'National Examinations Council',
      apiAliases: { qboard: 'neco' }
    },
    { 
      name: 'POST-UTME', 
      shortName: 'post-utme', 
      description: 'University Entrance Exams',
      apiAliases: { qboard: 'post-utme' }
    },
  ];

  for (const exam of exams) {
    await prisma.exam.upsert({
      where: { shortName: exam.shortName },
      update: {
        description: exam.description,
        name: exam.name,
        apiAliases: exam.apiAliases, // Update aliases if they exist/changed
      },
      create: {
        name: exam.name,
        shortName: exam.shortName,
        description: exam.description,
        duration: 60,
        apiAliases: exam.apiAliases,
      }
    });
  }
  console.log('📚 Exams seeded.');

  // --- 4. Seed Subjects with API Slugs ---
  // Mapped according to the Qboard API list provided
  const subjects = [
    { name: 'Mathematics', apiSlugs: { qboard: 'mathematics' } },
    { name: 'English Language', apiSlugs: { qboard: 'english' } },
    { name: 'Physics', apiSlugs: { qboard: 'physics' } },
    { name: 'Chemistry', apiSlugs: { qboard: 'chemistry' } },
    { name: 'Biology', apiSlugs: { qboard: 'biology' } },
    { name: 'Economics', apiSlugs: { qboard: 'economics' } },
    { name: 'Government', apiSlugs: { qboard: 'government' } },
    { name: 'Literature', apiSlugs: { qboard: 'englishlit' } },
    { name: 'CRS', apiSlugs: { qboard: 'crk' } },
    { name: 'Geography', apiSlugs: { qboard: 'geography' } },
    { name: 'Accounting', apiSlugs: { qboard: 'accounting' } },
    { name: 'Commerce', apiSlugs: { qboard: 'commerce' } },
    // Additional subjects found in Qboard list
    { name: 'Civic Education', apiSlugs: { qboard: 'civiledu' } },
    { name: 'History', apiSlugs: { qboard: 'history' } },
    { name: 'Insurance', apiSlugs: { qboard: 'insurance' } },
    { name: 'Current Affairs', apiSlugs: { qboard: 'currentaffairs' } },
    { name: 'IRS', apiSlugs: { qboard: 'irk' } },
  ];

  for (const subject of subjects) {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: subject.name }
    });

    if (!existingSubject) {
      await prisma.subject.create({
        data: {
          name: subject.name,
          apiSlugs: subject.apiSlugs,
        }
      });
      console.log(`➕ Created Subject: ${subject.name}`);
    } else {
        // Update existing subjects to ensure they have the latest apiSlugs
        await prisma.subject.update({
            where: { id: existingSubject.id },
            data: { apiSlugs: subject.apiSlugs }
        });
        console.log(`🔹 Updated Subject Slugs: ${subject.name}`);
    }
  }
  console.log('📖 Subjects seeding checked.');

  console.log('✅ Seeding completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
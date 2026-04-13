import {
  ExamPricingCategory,
  PlanInterval,
  PlanType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

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
  }

  const plans = [
    {
      name: 'Free',
      price: 0,
      interval: PlanInterval.LIFETIME,
      description: 'Basic access',
      type: PlanType.STUDENT,
      features: [],
    },
    {
      name: 'Monthly Premium',
      price: 2000,
      interval: PlanInterval.MONTHLY,
      description: 'Full access, No ads',
      type: PlanType.STUDENT,
      features: [],
    },
    {
      name: 'Quarterly Premium',
      price: 5000,
      interval: PlanInterval.QUARTERLY,
      description: 'Full access, No ads',
      type: PlanType.STUDENT,
      features: [],
    },
    {
      name: 'Yearly Premium',
      price: 15000,
      interval: PlanInterval.YEARLY,
      description: 'Full access, No ads',
      type: PlanType.STUDENT,
      features: [],
    },
    {
      name: 'Starter Schools',
      price: 0,
      interval: PlanInterval.MONTHLY,
      description: 'For smaller cohorts that only need a few core exams.',
      type: PlanType.ORGANIZATION,
      features: {},
      orgPricingEnabled: true,
      maxBaseExamSelections: 2,
      allowsSpecialExams: false,
      canCreateCustomExams: false,
      marketingBullets: [
        'Choose up to 2 base exams',
        'Simple monthly or yearly pricing by seat',
        'Best for focused preparation groups',
      ],
      seatBands: [
        { minSeats: 3, maxSeats: 50, monthlyPerStudent: 500, yearlyPerStudent: 5000, isContactSales: false },
        { minSeats: 51, maxSeats: 150, monthlyPerStudent: 450, yearlyPerStudent: 4500, isContactSales: false },
        { minSeats: 151, maxSeats: null, monthlyPerStudent: 0, yearlyPerStudent: 0, isContactSales: true },
      ],
    },
    {
      name: 'Growth Schools',
      price: 0,
      interval: PlanInterval.MONTHLY,
      description: 'Unlimited base exam access for schools that need broader preparation coverage.',
      type: PlanType.ORGANIZATION,
      features: {},
      orgPricingEnabled: true,
      maxBaseExamSelections: null,
      allowsSpecialExams: false,
      canCreateCustomExams: false,
      marketingBullets: [
        'Access all selected base exams',
        'Built for multi-classroom preparation',
        'Cleaner visibility into student readiness',
      ],
      seatBands: [
        { minSeats: 3, maxSeats: 100, monthlyPerStudent: 1000, yearlyPerStudent: 10000, isContactSales: false },
        { minSeats: 101, maxSeats: 300, monthlyPerStudent: 900, yearlyPerStudent: 9000, isContactSales: false },
        { minSeats: 301, maxSeats: null, monthlyPerStudent: 0, yearlyPerStudent: 0, isContactSales: true },
      ],
    },
    {
      name: 'Enterprise Schools',
      price: 0,
      interval: PlanInterval.MONTHLY,
      description: 'Full flexibility with premium exams and custom exam creation.',
      type: PlanType.ORGANIZATION,
      features: {},
      orgPricingEnabled: true,
      maxBaseExamSelections: null,
      allowsSpecialExams: true,
      canCreateCustomExams: true,
      marketingBullets: [
        'Add premium curated exams when needed',
        'Supports custom exam creation',
        'Designed for institutions with complex needs',
      ],
      seatBands: [
        { minSeats: 3, maxSeats: 100, monthlyPerStudent: 1200, yearlyPerStudent: 12000, isContactSales: false },
        { minSeats: 101, maxSeats: 500, monthlyPerStudent: 1100, yearlyPerStudent: 11000, isContactSales: false },
        { minSeats: 501, maxSeats: null, monthlyPerStudent: 0, yearlyPerStudent: 0, isContactSales: true },
      ],
    },
  ];

  for (const plan of plans) {
    const existingPlan = await prisma.plan.findFirst({
      where: { name: plan.name, type: plan.type },
      include: { seatBands: true },
    });

    if (!existingPlan) {
      await prisma.plan.create({
        data: {
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
          description: plan.description,
          type: plan.type,
          features: plan.features,
          isActive: true,
          orgPricingEnabled: Boolean((plan as any).orgPricingEnabled),
          marketingBullets: (plan as any).marketingBullets,
          maxBaseExamSelections: (plan as any).maxBaseExamSelections,
          allowsSpecialExams: Boolean((plan as any).allowsSpecialExams),
          canCreateCustomExams: Boolean((plan as any).canCreateCustomExams),
          seatBands: (plan as any).seatBands
            ? {
                create: (plan as any).seatBands,
              }
            : undefined,
        },
      });
      continue;
    }

    await prisma.plan.update({
      where: { id: existingPlan.id },
      data: {
        price: plan.price,
        interval: plan.interval,
        description: plan.description,
        features: plan.features,
        isActive: true,
        orgPricingEnabled: Boolean((plan as any).orgPricingEnabled),
        marketingBullets: (plan as any).marketingBullets,
        maxBaseExamSelections: (plan as any).maxBaseExamSelections,
        allowsSpecialExams: Boolean((plan as any).allowsSpecialExams),
        canCreateCustomExams: Boolean((plan as any).canCreateCustomExams),
      },
    });

    if ((plan as any).seatBands) {
      await prisma.orgPlanSeatBand.deleteMany({ where: { planId: existingPlan.id } });
      await prisma.orgPlanSeatBand.createMany({
        data: (plan as any).seatBands.map((band: any) => ({
          ...band,
          planId: existingPlan.id,
        })),
      });
    }
  }

  const exams = [
    {
      name: 'JAMB',
      shortName: 'jamb',
      description: 'Joint Admissions and Matriculation Board',
      apiAliases: { qboard: 'utme' },
      pricingCategory: ExamPricingCategory.BASE,
      monthlyFlatFee: 0,
      yearlyFlatFee: 0,
      monthlyPerStudentFee: 0,
      yearlyPerStudentFee: 0,
    },
    {
      name: 'WAEC',
      shortName: 'waec',
      description: 'West African Senior School Certificate Examination',
      apiAliases: { qboard: 'waec' },
      pricingCategory: ExamPricingCategory.BASE,
      monthlyFlatFee: 0,
      yearlyFlatFee: 0,
      monthlyPerStudentFee: 0,
      yearlyPerStudentFee: 0,
    },
    {
      name: 'NECO',
      shortName: 'neco',
      description: 'National Examinations Council',
      apiAliases: { qboard: 'neco' },
      pricingCategory: ExamPricingCategory.BASE,
      monthlyFlatFee: 0,
      yearlyFlatFee: 0,
      monthlyPerStudentFee: 0,
      yearlyPerStudentFee: 0,
    },
    {
      name: 'POST-UTME',
      shortName: 'post-utme',
      description: 'University Entrance Exams',
      apiAliases: { qboard: 'post-utme' },
      pricingCategory: ExamPricingCategory.SPECIAL,
      monthlyFlatFee: 50000,
      yearlyFlatFee: 500000,
      monthlyPerStudentFee: 150,
      yearlyPerStudentFee: 1500,
    },
  ];

  for (const exam of exams) {
    await prisma.exam.upsert({
      where: { shortName: exam.shortName },
      update: {
        description: exam.description,
        name: exam.name,
        apiAliases: exam.apiAliases,
        pricingCategory: exam.pricingCategory,
        monthlyFlatFee: exam.monthlyFlatFee,
        yearlyFlatFee: exam.yearlyFlatFee,
        monthlyPerStudentFee: exam.monthlyPerStudentFee,
        yearlyPerStudentFee: exam.yearlyPerStudentFee,
      },
      create: {
        name: exam.name,
        shortName: exam.shortName,
        description: exam.description,
        duration: 60,
        apiAliases: exam.apiAliases,
        pricingCategory: exam.pricingCategory,
        monthlyFlatFee: exam.monthlyFlatFee,
        yearlyFlatFee: exam.yearlyFlatFee,
        monthlyPerStudentFee: exam.monthlyPerStudentFee,
        yearlyPerStudentFee: exam.yearlyPerStudentFee,
      },
    });
  }

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
    { name: 'Civic Education', apiSlugs: { qboard: 'civiledu' } },
    { name: 'History', apiSlugs: { qboard: 'history' } },
    { name: 'Insurance', apiSlugs: { qboard: 'insurance' } },
    { name: 'Current Affairs', apiSlugs: { qboard: 'currentaffairs' } },
    { name: 'IRS', apiSlugs: { qboard: 'irk' } },
  ];

  for (const subject of subjects) {
    const existingSubject = await prisma.subject.findFirst({ where: { name: subject.name } });

    if (!existingSubject) {
      await prisma.subject.create({
        data: {
          name: subject.name,
          apiSlugs: subject.apiSlugs,
        },
      });
      continue;
    }

    await prisma.subject.update({
      where: { id: existingSubject.id },
      data: { apiSlugs: subject.apiSlugs },
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LineChart } from 'lucide-react';
import { SignOutButton } from '@/components/SignOutButton';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { ExamSelector } from '@/components/ExamSelector';
import { UserRole } from '@prisma/client';
// import { UserRole } from '@/lib/generated/prisma/enums';
import Link from 'next/link';


async function seedData() {
  'use server';

  // Seed Exams
  const waec = await prisma.exam.upsert({
    where: { shortName: 'WAEC' },
    update: {},
    create: { name: 'WASSCE (WAEC)', shortName: 'WAEC' },
  });

  const utme = await prisma.exam.upsert({
    where: { shortName: 'UTME' },
    update: {},
    create: { name: 'UTME (JAMB)', shortName: 'UTME' },
  });
  
  // Seed Subjects
  const math = await prisma.subject.upsert({
    where: { name: 'Mathematics' },
    update: {},
    create: { name: 'Mathematics' },
  });
  
  const english = await prisma.subject.upsert({
    where: { name: 'English Language' },
    update: {},
    create: { name: 'English Language' },
  });

  // Link Subjects to Exams (Many-to-Many)
  await prisma.exam.update({
    where: { id: waec.id },
    data: {
      subjects: {
        connect: [{ id: math.id }, { id: english.id }],
      },
    },
  });
  
  await prisma.exam.update({
    where: { id: utme.id },
    data: {
      subjects: {
        connect: [{ id: math.id }, { id: english.id }],
      },
    },
  });

  // Seed a dummy question so the "Year" selector works
  await prisma.question.upsert({
    where: { text: 'What is 2 + 2?' },
    update: {},
    create: {
      text: 'What is 2 + 2?',
      year: 2023,
      examId: waec.id,
      subjectId: math.id,
      options: {
        create: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false },
        ],
      },
    },
  });
}



export default async function DashboardPage() {
  const session = await getAuthSession();

  // 1. Auth & Verification Check
  if (!session?.user) {
    redirect('/login');
  }
  if (!session.user.emailVerified) {
    redirect('/verify-email');
  }

  // 2. Role-Based Redirects
  // If user is an ADMIN, send them to the admin panel
  if (session.user.role === UserRole.ADMIN) {
    redirect('/admin');
  }
  // If user is an ORGANIZATION, send them to the org panel
  if (session.user.role === UserRole.ORGANIZATION) {
    redirect('/organization');
  }

  // 3. Fetch Data for STUDENT Dashboard
  // This user must be a STUDENT to be here.
  const exams = await prisma.exam.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Hi, {session.user.name || 'Student'}!
          </h1>
          <p className="text-lg text-muted-foreground">
            Let's get practicing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/performance">
              <LineChart className="w-4 h-4 mr-2" />
              My Performance
            </Link>
          </Button>
          <SignOutButton />
        </div>
      </header>

      <main className="space-y-8">
        {/* Main Exam Selector Component */}
        <ExamSelector exams={exams} />
        
        {/* Component to allow user to change their role */}
        {/* <RoleSwitcher currentRole={session.user.role} /> */}

        {/* --- Seeder Button for Development --- */}
        {/* {exams.length === 0 && (
          <div className="mt-8 p-6 border-dashed border-2 rounded-lg text-center">
            <h3 className="text-xl font-semibold">No Exams Found</h3>
            <p className="mb-4 text-muted-foreground">
              Click the button to seed default exams and subjects for testing.
            </p>
            <form action={seedData}>
              <Button type="submit">Seed Dev Data</Button>
            </form>
          </div>
        )} */}
      </main>
    </div>
  );
}
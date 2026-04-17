import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getOrganizationContext } from '@/lib/organization';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const orgContext = session.user.role === UserRole.ORGANIZATION ? await getOrganizationContext(session) : null;
    const orgId = orgContext?.organizationId ?? (session.user as any).organizationId;

    const [exams, subjects, globalPaperCombos, globalQuestionCombos] = await Promise.all([
      // Exams are usually global standards (WAEC, etc), so fetch all
      prisma.exam.findMany({ orderBy: { name: 'asc' } }),
      
      // Subjects: Fetch Global (null Org) + Private (My Org)
      prisma.subject.findMany({ 
        where: {
            OR: [
                { organizationId: null }, // Global
                ...(orgId ? [{ organizationId: orgId }] : []) // My Org's
            ]
        },
        orderBy: { name: 'asc' } 
      }),
      prisma.examPaper.findMany({
        where: {
          organizationId: null,
          isPublic: true,
          year: { not: null },
        },
        select: {
          examId: true,
          subjectId: true,
          year: true,
        },
        distinct: ['examId', 'subjectId', 'year'],
      }),
      prisma.question.findMany({
        where: {
          organizationId: null,
          year: { not: null },
          subjectId: { not: null },
        },
        select: {
          examId: true,
          subjectId: true,
          year: true,
        },
        distinct: ['examId', 'subjectId', 'year'],
      }),
    ]);

    const comboMap = new Map<string, { examId: string; subjectId: string; year: number }>();

    [...globalPaperCombos, ...globalQuestionCombos].forEach((combo) => {
      if (!combo.subjectId || combo.year == null) return;
      const key = `${combo.examId}:${combo.subjectId}:${combo.year}`;
      comboMap.set(key, {
        examId: combo.examId,
        subjectId: combo.subjectId,
        year: combo.year,
      });
    });

    const cloneCatalog = Array.from(comboMap.values())
      .map((combo) => ({
        ...combo,
        examName: exams.find((exam) => exam.id === combo.examId)?.name || '',
        subjectName: subjects.find((subject) => subject.id === combo.subjectId)?.name || '',
      }))
      .filter((combo) => combo.examName && combo.subjectName)
      .sort((a, b) => {
        if (a.examName !== b.examName) return a.examName.localeCompare(b.examName);
        if (a.subjectName !== b.subjectName) return a.subjectName.localeCompare(b.subjectName);
        return b.year - a.year;
      });

    return NextResponse.json({ exams, subjects, cloneCatalog });
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}

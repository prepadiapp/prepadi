import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { examId, subjectId, year } = await request.json();

    // 1. Fetch names for title generation
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

    if (!exam || !subject) return new NextResponse('Invalid Exam/Subject', { status: 400 });

    // 2. Check if Paper exists
    let paper = await prisma.examPaper.findFirst({
        where: {
            examId,
            subjectId,
            year,
            // If Admin, find Public paper. If Org, find THEIR paper.
            organizationId: session.user.role === UserRole.ORGANIZATION ? session.user.organizationId : null,
            isPublic: session.user.role === UserRole.ADMIN
        }
    });

    // 3. Create if not found
    if (!paper) {
        paper = await prisma.examPaper.create({
            data: {
                title: `${exam.name} ${subject.name} ${year}`,
                examId,
                subjectId,
                year,
                authorId: session.user.id,
                organizationId: session.user.organizationId,
                isPublic: session.user.role === UserRole.ADMIN
            }
        });

        // 4. Auto-Link Existing Questions
        // Logic: Find questions matching E/S/Y that DON'T have a paperId yet.
        await prisma.question.updateMany({
            where: {
                examId,
                subjectId,
                year,
                paperId: null,
                organizationId: session.user.organizationId // Match ownership strictly? Or allow Admins to claim null?
                // For simplicity: If Admin, claim public (null org) questions. If Org, claim own questions.
            },
            data: {
                paperId: paper.id
            }
        });
    }

    return NextResponse.json(paper);
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
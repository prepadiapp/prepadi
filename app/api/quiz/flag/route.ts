import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { verifyUserAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';

const MAX_COMMENT_LENGTH = 500;

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.role !== UserRole.STUDENT) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const questionId = typeof body.questionId === 'string' ? body.questionId : '';
    const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : undefined;
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    if (!questionId) return new NextResponse('Question is required', { status: 400 });
    if (comment.length > MAX_COMMENT_LENGTH) {
      return new NextResponse(`Comments must be ${MAX_COMMENT_LENGTH} characters or fewer`, { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        examId: true,
        subjectId: true,
        year: true,
        isFlagged: true,
        flaggedAt: true,
        paper: {
          select: {
            id: true,
            status: true,
            organizationId: true,
            practiceEnabled: true,
            examination: { select: { practiceEnabled: true } },
          },
        },
      },
    });

    if (!question || !question.paper || question.paper.status !== 'PUBLISHED') {
      return new NextResponse('Question is not available for reporting', { status: 404 });
    }

    if (assignmentId) {
      const [assignment, access] = await Promise.all([
        prisma.assignment.findUnique({
          where: { id: assignmentId },
          select: { paperId: true },
        }),
        verifyUserAccess(session.user.id, { assignmentId }),
      ]);

      if (!access.allowed || assignment?.paperId !== question.paper.id) {
        return new NextResponse('You cannot report a question outside this assignment', { status: 403 });
      }
    } else {
      if (question.paper.organizationId) {
        const [user, access] = await Promise.all([
          prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
              organizationId: true,
              ownedOrganization: { select: { id: true } },
            },
          }),
          verifyUserAccess(session.user.id, {
            examId: question.examId,
            subjectId: question.subjectId,
            ...(question.year ? { year: question.year } : {}),
          }),
        ]);

        const belongsToUser =
          user?.organizationId === question.paper.organizationId ||
          user?.ownedOrganization?.id === question.paper.organizationId;
        const practiceEnabled = question.paper.practiceEnabled || question.paper.examination?.practiceEnabled;

        if (!belongsToUser || !practiceEnabled || !access.allowed) {
          return new NextResponse('You cannot report a question outside your available practice papers', { status: 403 });
        }
      } else {
        const access = await verifyUserAccess(session.user.id, {
          examId: question.examId,
          subjectId: question.subjectId,
          ...(question.year ? { year: question.year } : {}),
        });

        if (!access.allowed) {
          return new NextResponse('You cannot report a question outside your available practice papers', { status: 403 });
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id: question.id },
        data: {
          isFlagged: true,
          flaggedAt: question.flaggedAt ?? new Date(),
        },
      });

      await tx.questionReviewNote.create({
        data: {
          questionId: question.id,
          authorId: session.user.id,
          note: comment ? `Student report: ${comment}` : 'Student report: No comment provided.',
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[QUIZ_QUESTION_FLAG_ERROR]', error);
    return new NextResponse('Could not save this report. Please try again.', { status: 500 });
  }
}

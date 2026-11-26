import { getAuthSession } from '@/lib/auth';
import { verifyUserAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Practice-mode instant check. Given a question + the picked option, returns
 * whether it is correct, the correct option id, and the explanation.
 * The full answer key is never sent to the client; only this single verdict.
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { questionId, optionId } = body as { questionId?: string; optionId?: string };

    if (!questionId || !optionId) {
      return new NextResponse('Missing questionId or optionId', { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: true,
        paper: true,
      },
    });

    if (!question || question.type !== 'OBJECTIVE') {
      return new NextResponse('Question not found', { status: 404 });
    }

    const picked = question.options.find((opt) => opt.id === optionId);
    if (!picked) {
      return new NextResponse('Option does not belong to this question', { status: 400 });
    }

    // Access check: the question must come from content this user may open.
    // Org papers require org membership; platform papers must be published
    // and pass the same plan checks as starting a quiz on them.
    if (question.paper) {
      if (question.paper.organizationId) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { organizationId: true, ownedOrganization: { select: { id: true } } },
        });
        const isMember = user?.organizationId === question.paper.organizationId;
        const isOwner = user?.ownedOrganization?.id === question.paper.organizationId;
        if (!isMember && !isOwner) {
          return new NextResponse('Forbidden', { status: 403 });
        }
      } else {
        if (question.paper.status !== 'PUBLISHED') {
          return new NextResponse('Forbidden', { status: 403 });
        }
        const access = await verifyUserAccess(session.user.id, {
          examId: question.paper.examId,
          subjectId: question.paper.subjectId,
          year: question.paper.year ?? undefined,
        });
        if (!access.allowed) {
          return new NextResponse(access.reason || 'Forbidden', { status: 403 });
        }
      }
    } else {
      // Standalone/bank questions carry their own exam link; apply plan checks.
      const access = await verifyUserAccess(session.user.id, {
        examId: question.examId,
        subjectId: question.subjectId,
        year: question.year ?? undefined,
      });
      if (!access.allowed) {
        return new NextResponse(access.reason || 'Forbidden', { status: 403 });
      }
    }

    const correctOption = question.options.find((opt) => opt.isCorrect);

    return NextResponse.json({
      correct: picked.isCorrect,
      correctOptionId: correctOption?.id ?? null,
      explanation: question.explanation ?? '',
    });
  } catch (error) {
    console.error('[QUIZ_CHECK_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

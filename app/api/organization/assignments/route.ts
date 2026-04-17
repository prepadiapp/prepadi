import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getOrganizationContext } from '@/lib/organization';
import { toUtcDateTime } from '@/lib/datetime';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const org = await getOrganizationContext(session);
    if (!org) return new NextResponse('Organization ID missing', { status: 403 });

    const assignments = await prisma.assignment.findMany({
      where: { organizationId: org.organizationId },
      include: {
        paper: { select: { id: true, title: true, paperLabel: true, _count: { select: { questions: true } } } },
        examination: { select: { id: true, title: true, status: true, category: true } },
        _count: { 
            select: { 
                results: true // FIX: Changed 'attempts' to 'results' to match schema relation
            } 
        }
      },
      orderBy: { startTime: 'desc' }
    });

    // Remap for frontend consistency if needed
    const formattedAssignments = assignments.map(a => ({
        ...a,
        _count: {
            attempts: a._count.results 
        }
    }));

    return NextResponse.json(formattedAssignments);

  } catch (error) {
    console.error('[ORG_ASSIGNMENTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const org = await getOrganizationContext(session);
    if (!org) return new NextResponse('Organization ID missing', { status: 403 });

    const body = await req.json();
    const { title, paperId, examinationId, startTime, endTime, duration } = body;

    if (!title || (!paperId && !examinationId) || !startTime || !endTime) {
        return new NextResponse('Missing required fields', { status: 400 });
    }

    const resolvedStart = toUtcDateTime(startTime);
    const resolvedEnd = toUtcDateTime(endTime);

    if (!resolvedStart || !resolvedEnd || resolvedEnd <= resolvedStart) {
      return new NextResponse('Invalid schedule range', { status: 400 });
    }

    let resolvedPaperId = paperId as string | undefined;
    let resolvedExaminationId = examinationId as string | undefined;

    if (resolvedExaminationId && !resolvedPaperId) {
      const examination = await prisma.organizationExamination.findFirst({
        where: {
          id: resolvedExaminationId,
          organizationId: org.organizationId,
          status: { not: 'ARCHIVED' },
        },
        include: {
          papers: {
            where: { status: 'PUBLISHED' },
            orderBy: [{ createdAt: 'asc' }],
            take: 1,
          },
        },
      });

      if (!examination) return new NextResponse('Invalid examination selection', { status: 400 });
      if (examination.papers.length === 0) {
        return new NextResponse('Publish at least one paper before scheduling this examination', { status: 400 });
      }

      resolvedPaperId = examination.papers[0].id;
    }

    if (!resolvedPaperId) {
      return new NextResponse('A paper is required for scheduling', { status: 400 });
    }

    // Verify paper belongs to org
    const paper = await prisma.examPaper.findFirst({
        where: { id: resolvedPaperId, organizationId: org.organizationId }
    });

    if (!paper) return new NextResponse('Invalid paper selection', { status: 400 });

    resolvedExaminationId = resolvedExaminationId ?? paper.examinationId ?? undefined;

    const assignment = await prisma.assignment.create({
        data: {
            title,
            paperId: resolvedPaperId,
            examinationId: resolvedExaminationId,
            organizationId: org.organizationId,
            startTime: resolvedStart,
            endTime: resolvedEnd,
            duration: duration ? parseInt(duration) : null,
            status: 'ACTIVE' 
        }
    });

    return NextResponse.json(assignment);

  } catch (error) {
    console.error('[ORG_ASSIGNMENTS_CREATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const org = await getOrganizationContext(session);
    if (!org) return new NextResponse('Organization ID missing', { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new NextResponse('Assignment ID missing', { status: 400 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.title) updateData.title = body.title;
    if (body.duration !== undefined) updateData.duration = body.duration ? parseInt(body.duration, 10) : null;
    if (body.status) updateData.status = body.status;

    if (body.startTime !== undefined) {
      const parsed = toUtcDateTime(body.startTime);
      if (!parsed) return new NextResponse('Invalid start time', { status: 400 });
      updateData.startTime = parsed;
    }

    if (body.endTime !== undefined) {
      const parsed = toUtcDateTime(body.endTime);
      if (!parsed) return new NextResponse('Invalid end time', { status: 400 });
      updateData.endTime = parsed;
    }

    const assignment = await prisma.assignment.updateMany({
      where: {
        id,
        organizationId: org.organizationId,
      },
      data: updateData,
    });

    return NextResponse.json({ success: assignment.count > 0 });
  } catch (error) {
    console.error('[ORG_ASSIGNMENTS_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const org = await getOrganizationContext(session);
    if (!org) return new NextResponse('Organization ID missing', { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new NextResponse('Assignment ID missing', { status: 400 });

    await prisma.assignment.deleteMany({
      where: {
        id,
        organizationId: org.organizationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ORG_ASSIGNMENTS_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

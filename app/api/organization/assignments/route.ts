import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Robust Org ID Resolution
    let orgId = (session.user as any).organizationId;
    if (!orgId) {
        const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
        orgId = dbUser?.organizationId;
    }
    if (!orgId) {
        const ownerOrg = await prisma.organization.findUnique({ where: { ownerId: session.user.id }, select: { id: true } });
        orgId = ownerOrg?.id;
    }

    if (!orgId) return new NextResponse('Organization ID missing', { status: 403 });

    const assignments = await prisma.assignment.findMany({
      where: { organizationId: orgId },
      include: {
        paper: { select: { title: true, _count: { select: { questions: true } } } },
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
    
    // Robust Org ID Resolution
    let orgId = (session.user as any).organizationId;
    if (!orgId) {
        const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
        orgId = dbUser?.organizationId;
    }
    if (!orgId) {
        const ownerOrg = await prisma.organization.findUnique({ where: { ownerId: session.user.id }, select: { id: true } });
        orgId = ownerOrg?.id;
    }

    if (!orgId) return new NextResponse('Organization ID missing', { status: 403 });

    const body = await req.json();
    const { title, paperId, startTime, endTime, duration } = body;

    if (!title || !paperId || !startTime || !endTime) {
        return new NextResponse('Missing required fields', { status: 400 });
    }

    // Verify paper belongs to org
    const paper = await prisma.examPaper.findUnique({
        where: { id: paperId, organizationId: orgId }
    });

    if (!paper) return new NextResponse('Invalid paper selection', { status: 400 });

    const assignment = await prisma.assignment.create({
        data: {
            title,
            paperId,
            organizationId: orgId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
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
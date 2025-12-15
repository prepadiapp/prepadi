import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole, QuestionType } from '@prisma/client';

// Helper to check ownership
async function verifyOrgAccess(questionId: string, orgId: string) {
    const q = await prisma.question.findUnique({ where: { id: questionId } });
    return q && q.organizationId === orgId;
}

// Helper to get robust Org ID
async function getRobustOrgId(session: any) {
    let orgId = session.user.organizationId;
    if (!orgId) {
        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true }
        });
        orgId = dbUser?.organizationId;
    }
    if (!orgId) {
        const ownerOrg = await prisma.organization.findUnique({
            where: { ownerId: session.user.id },
            select: { id: true }
        });
        orgId = ownerOrg?.id;
    }
    return orgId;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) return new NextResponse('Unauthorized', { status: 401 });
    
    const { id } = await params;
    const orgId = await getRobustOrgId(session);

    if (!orgId) return new NextResponse('Org ID missing', { status: 403 });
    if (!await verifyOrgAccess(id, orgId)) return new NextResponse('Forbidden: You do not own this question', { status: 403 });

    const body = await req.json();
    const { text, explanation, imageUrl, options, section, type } = body; // Added type

    // --- Handle Section ---
    let sectionId: string | null | undefined = undefined;
    if (section !== undefined) {
        if (section && section.trim() !== '') {
            const sectionText = section.trim();
            let dbSection = await prisma.section.findFirst({ where: { instruction: sectionText } });
            if (!dbSection) {
                dbSection = await prisma.section.create({ data: { instruction: sectionText } });
            }
            sectionId = dbSection.id;
        } else {
            sectionId = null; 
        }
    }

    // --- Handle Options ---
    const deleteOps: any[] = [];
    const updateOps: any[] = [];
    let createOps: any = null;

    if (options && Array.isArray(options)) {
        const existingOptions = await prisma.option.findMany({
            where: { questionId: id },
            select: { id: true },
        });
        const existingOptionIds = existingOptions.map(o => o.id);
        const safeOptions = options || [];
        const incomingOptionIds = safeOptions.filter((o: any) => o.id && !o.id.toString().startsWith('temp-')).map((o: any) => o.id);
        
        const optionsToDelete = existingOptionIds.filter(optId => !incomingOptionIds.includes(optId));
        
        if (optionsToDelete.length > 0) {
            deleteOps.push(prisma.option.deleteMany({ where: { id: { in: optionsToDelete } } }));
        }
        
        safeOptions.forEach((opt: any) => {
            if (opt.id && !opt.id.toString().startsWith('temp-')) {
                updateOps.push(prisma.option.update({
                    where: { id: opt.id },
                    data: { text: opt.text, isCorrect: opt.isCorrect },
                }));
            }
        });
        
        const optionsToCreate = safeOptions.filter((opt: any) => !opt.id || opt.id.toString().startsWith('temp-'));
        if (optionsToCreate.length > 0) {
             createOps = prisma.option.createMany({
                data: optionsToCreate.map((opt: any) => ({
                    questionId: id,
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                })),
            });
        }
    }

    // --- Execute Update ---
    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (type !== undefined) updateData.type = type as QuestionType; // Allow changing type
    if (sectionId !== undefined) updateData.sectionId = sectionId;

    const transactionOps = [
        prisma.question.update({ where: { id }, data: updateData }),
        ...deleteOps,
        ...updateOps,
    ];
    if (createOps) transactionOps.push(createOps);

    const [updated] = await prisma.$transaction(transactionOps);

    return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) return new NextResponse('Unauthorized', { status: 401 });
    
    const { id } = await params;
    const orgId = await getRobustOrgId(session);

    if (!orgId) return new NextResponse('Org ID missing', { status: 403 });
    if (!await verifyOrgAccess(id, orgId)) return new NextResponse('Forbidden', { status: 403 });

    // Use transaction to cleanup
    await prisma.$transaction([
        prisma.userAnswer.deleteMany({ where: { questionId: id } }),
        prisma.question.delete({ where: { id } })
    ]);
    
    return NextResponse.json({ success: true });
}
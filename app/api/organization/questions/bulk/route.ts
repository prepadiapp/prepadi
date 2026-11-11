import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { ContentStatus, ExaminationCategory, UserRole } from '@prisma/client';
import { parseBulkTextWithAI } from '@/lib/ai';
import { ensureOrganizationExamination } from '@/lib/org-examinations';
import { getOrganizationContext } from '@/lib/organization';
import { extractDocumentContent } from '@/lib/document-extraction';
import { parseBulkText } from '@/lib/parser';
import { validateBulkQuestions } from '@/lib/bulk-question-validation';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    
    // 1. Auth Check (Org Only)
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const org = await getOrganizationContext(session);
    if (!org) return new NextResponse('Organization ID missing', { status: 403 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const paperTitle = formData.get('paperTitle') as string;
    const useAI = formData.get('useAI') === 'true';
    
    const subjectId = formData.get('subjectId') as string;
    const newSubjectName = formData.get('newSubjectName') as string;
    
    // Optional Year (Default to current if not provided)
    const yearRaw = formData.get('year');
    const year = yearRaw ? parseInt(yearRaw as string) : new Date().getFullYear();

    if (!file || !paperTitle) return new NextResponse("Missing file or title", { status: 400 });
    if (!subjectId && !newSubjectName) return new NextResponse("Missing subject", { status: 400 });

    // 2. Extract Content
    const extractedContent = await extractDocumentContent(file);
    const docContent = extractedContent.html || extractedContent.text;

    if (!docContent || docContent.trim().length === 0) {
        return new NextResponse("Document appears empty", { status: 400 });
    }

    // 3. Parse Questions
    let parsedQuestions: any[] = [];
    
    if (useAI) {
        const aiResult = await parseBulkTextWithAI(docContent);
        parsedQuestions = aiResult.questions || [];
    } else {
        parsedQuestions = parseBulkText(docContent);
    }

    if (!parsedQuestions || parsedQuestions.length === 0) {
        return new NextResponse("No questions extracted.", { status: 400 });
    }

    const validationIssues = validateBulkQuestions(parsedQuestions, {
        requireObjectiveExplanation: useAI,
    });

    if (validationIssues.length > 0) {
        return NextResponse.json(
            { error: 'Please fix the listed questions in the source document and upload again.', issues: validationIssues },
            { status: 422 }
        );
    }

    // 4. Save to Database
    const targetOrgId = org.organizationId;

    const result = await prisma.$transaction(async (tx) => {
        // A. Resolve Subject
        let finalSubjectId = subjectId;
        if (newSubjectName) {
            const existingSub = await tx.subject.findFirst({
                where: { 
                    name: { equals: newSubjectName, mode: 'insensitive' },
                    OR: [{ organizationId: targetOrgId }, { organizationId: null }]
                }
            });

            if (existingSub) {
                finalSubjectId = existingSub.id;
            } else {
                const newSub = await tx.subject.create({
                    data: { name: newSubjectName, organizationId: targetOrgId }
                });
                finalSubjectId = newSub.id;
            }
        }

        // B. Default Exam
        let defaultExam = await tx.exam.findFirst({ where: { name: 'Internal' } });
        if (!defaultExam) defaultExam = await tx.exam.findFirst();
        
        // C. Create Paper
        const examination = await ensureOrganizationExamination({
            organizationId: targetOrgId,
            authorId: session.user.id,
            title: paperTitle,
            category: year ? ExaminationCategory.YEARLY : ExaminationCategory.CUSTOM,
            year,
            status: ContentStatus.DRAFT,
        }, tx);

        const paper = await tx.examPaper.create({
            data: {
                title: paperTitle,
                year: year, // Use optional/default year
                examId: defaultExam?.id!,
                subjectId: finalSubjectId,
                organizationId: targetOrgId,
                authorId: session.user.id,
                examinationId: examination.id,
                isPublic: false,
                isVerified: true,
                status: ContentStatus.DRAFT,
                paperLabel: 'Paper 1',
            }
        });

        // D. Create Questions
        for (const q of parsedQuestions) {
            if (!q.text || (!q.options && q.type !== 'THEORY')) continue;

            // --- HANDLE SECTION PERSISTENCE ---
            let sectionId = null;
            if (q.section && typeof q.section === 'string' && q.section.trim().length > 0) {
                const sectionText = q.section.trim();
                
                const existingSection = await tx.section.findFirst({
                    where: { instruction: sectionText }
                });

                if (existingSection) {
                    sectionId = existingSection.id;
                } else {
                    const newSection = await tx.section.create({
                        data: { instruction: sectionText }
                    });
                    sectionId = newSection.id;
                }
            }

            // Tags
            const tagConnects = [];
            if (q.tags && Array.isArray(q.tags)) {
                for (const tagName of q.tags) {
                    const tag = await tx.tag.upsert({
                        where: { name: tagName },
                        update: {},
                        create: { name: tagName }
                    });
                    tagConnects.push({ id: tag.id });
                }
            }

            await tx.question.create({
                data: {
                    text: q.text,
                    explanation: q.explanation || null,
                    markingGuide: q.markingGuide || null,
                    year: year,
                    examId: defaultExam?.id!,
                    subjectId: finalSubjectId,
                    organizationId: targetOrgId,
                    paperId: paper.id,
                    sectionId: sectionId, 
                    moderationStatus: ContentStatus.DRAFT,
                    type: q.type === 'THEORY' ? 'THEORY' : 'OBJECTIVE',
                    options: {
                        create: q.options ? q.options.map((opt: any) => ({
                            text: opt.text,
                            isCorrect: !!opt.isCorrect
                        })) : []
                    },
                    tags: { connect: tagConnects }
                }
            });
        }
        return paper;
    });

    return NextResponse.json({ 
        success: true, 
        count: parsedQuestions.length, 
        paperId: result.id,
        paperTitle: result.title 
    });

  } catch (error: any) {
    console.error('[ORG_BULK_UPLOAD_ERROR]', error);
    return new NextResponse(error.message || 'Internal Processing Error', { status: 500 });
  }
}

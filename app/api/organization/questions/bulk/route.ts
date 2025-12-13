import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import mammoth from 'mammoth';
import { parseBulkTextWithAI } from '@/lib/ai';
import { parseBulkText } from '@/lib/parser';

// --- 1. Regex Parsing Logic (Standard) ---
function parseStandardText(text: string) {
  const questions: any[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let currentSection: string | null = null;
  let currentQuestion: any = null;

  for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Detect Section Headers
      const sectionMatch = line.match(/^(?:SECTION|INSTRUCTION|PASSAGE|PART)\s*[:\-]?\s*(.*)/i);
      
      if (sectionMatch) {
          if (!line.match(/^\d+[\.\)]/)) {
             currentSection = line; 
             continue;
          }
      }

      // 2. Detect New Question
      const qMatch = line.match(/^(\d+)[\.\)\-]\s*(.+)/);
      if (qMatch) {
          if (currentQuestion) {
              questions.push(currentQuestion);
          }
          currentQuestion = {
              text: qMatch[2],
              options: [],
              section: currentSection
          };
          continue;
      }

      // 3. Detect Options
      const optMatch = line.match(/^(\(?[A-Ea-e]\)?|\(?[A-Ea-e]\.)\s+(.+)/);
      if (currentQuestion && optMatch) {
          const keyRaw = optMatch[1].replace(/[\(\)\.]/g, '').toUpperCase();
          currentQuestion.options.push({
              key: keyRaw,
              text: optMatch[2],
              isCorrect: false 
          });
          continue;
      }

      // 4. Detect Answer
      const ansMatch = line.match(/^(?:Ans|Answer|Correct):\s*([A-E])/i);
      if (currentQuestion && ansMatch) {
          const correctKey = ansMatch[1].toUpperCase();
          currentQuestion.options.forEach((opt: any) => {
              if (opt.key === correctKey) opt.isCorrect = true;
          });
          continue;
      }

      // 5. Append text
      if (currentQuestion && currentQuestion.options.length === 0) {
          currentQuestion.text += " " + line;
      }
  }

  if (currentQuestion) {
      questions.push(currentQuestion);
  }

  return questions;
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    
    // 1. Auth Check (Org Only)
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    let orgId = (session.user as any).organizationId;
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

    if (!orgId) return new NextResponse('Organization ID missing', { status: 403 });

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

    // 2. Extract Text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { value: docText } = await mammoth.extractRawText({ buffer });

    if (!docText || docText.trim().length === 0) {
        return new NextResponse("Document appears empty", { status: 400 });
    }

    // 3. Parse Questions
    let parsedQuestions: any[] = [];
    
    if (useAI) {
        const aiResult = await parseBulkTextWithAI(docText);
        parsedQuestions = aiResult.questions || [];
    } else {
        parsedQuestions = parseStandardText(docText);
    }

    if (!parsedQuestions || parsedQuestions.length === 0) {
        return new NextResponse("No questions extracted.", { status: 400 });
    }

    // 4. Save to Database
    const targetOrgId = orgId;

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
        const paper = await tx.examPaper.create({
            data: {
                title: paperTitle,
                year: year, // Use optional/default year
                examId: defaultExam?.id!,
                subjectId: finalSubjectId,
                organizationId: targetOrgId,
                authorId: session.user.id,
                isPublic: false,
                isVerified: true 
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
                    year: year,
                    examId: defaultExam?.id!,
                    subjectId: finalSubjectId,
                    organizationId: targetOrgId,
                    paperId: paper.id,
                    sectionId: sectionId, 
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
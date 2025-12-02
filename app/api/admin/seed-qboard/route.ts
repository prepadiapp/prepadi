import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const qboardSubjects = {
    "English Language": "english",
    "Mathematics": "mathematics",
    "Commerce": "commerce",
    "Accounting": "accounting",
    "Biology": "biology",
    "Physics": "physics",
    "Chemistry": "chemistry",
    "English Literature": "englishlit",
    "Government": "government",
    "CRK": "crk",
    "Geography": "geography",
    "Economics": "economics",
    "IRK": "irk",
    "Civic Education": "civiledu",
    "Insurance": "insurance",
    "Current Affairs": "currentaffairs",
    "History": "history"
  };

  const qboardExams = {
    "UTME (JAMB)": "utme",
    "WASSCE (WAEC)": "wassce",
    "Post-UTME": "post-utme"
  };

  try {
    // 1. Seed Subjects
    for (const [name, slug] of Object.entries(qboardSubjects)) {
      const existing = await prisma.subject.findFirst({ where: { name } });
      if (existing) {
        // Update existing with slug
        const currentSlugs = (existing.apiSlugs as any) || {};
        await prisma.subject.update({
          where: { id: existing.id },
          data: { 
            apiSlugs: { ...currentSlugs, "qboard": slug } 
          }
        });
      } else {
        // Create new
        await prisma.subject.create({
          data: {
            name,
            apiSlugs: { "qboard": slug },
            organizationId: null
          }
        });
      }
    }

    // 2. Seed Exams
    for (const [name, slug] of Object.entries(qboardExams)) {
        const existing = await prisma.exam.findFirst({ where: { name } });
        
        // Note: We need a unique shortName if creating new. 
        // We'll derive it from the slug for simplicity if creating.
        const shortName = name.split(' ')[0].toUpperCase();

        if (existing) {
            const currentAliases = (existing.apiAliases as any) || {};
            await prisma.exam.update({
                where: { id: existing.id },
                data: {
                    apiAliases: { ...currentAliases, "qboard": slug }
                }
            });
        } else {
            // Check if shortName exists to avoid collision
            const shortNameExists = await prisma.exam.findUnique({ where: { shortName } });
            if (!shortNameExists) {
                await prisma.exam.create({
                    data: {
                        name,
                        shortName,
                        description: "Standard Exam",
                        apiAliases: { "qboard": slug }
                    }
                });
            }
        }
    }

    return NextResponse.json({ success: true, message: "Qboard metadata seeded successfully" });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
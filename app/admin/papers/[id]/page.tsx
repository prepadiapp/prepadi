import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { AdminPaperManagerClient } from './client'; // New client
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaperManagePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const paper = await prisma.examPaper.findUnique({
    where: { id },
    include: {
      exam: true,
      subject: true,
      questions: {
        include: { 
            options: true,
            section: true
        },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!paper) notFound();

  return <AdminPaperManagerClient paper={paper} />;
}
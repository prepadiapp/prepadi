import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { OrgPaperManagerClient } from './client';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getOrganizationContext } from '@/lib/organization';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrgPaperManagePage({ params }: PageProps) {
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    redirect('/login');
  }

  const org = await getOrganizationContext(session);
  if (!org) redirect('/dashboard');

  const resolvedParams = await params;
  const { id } = resolvedParams;

  const paper = await prisma.examPaper.findFirst({
    where: { id, organizationId: org.organizationId },
    include: {
      exam: true,
      subject: true,
      examination: true,
      questions: {
        include: {
          options: true,
          section: true,
          tags: true,
          questionReviewEntries: {
            include: {
              author: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!paper) notFound();

  return <OrgPaperManagerClient paper={paper} />;
}

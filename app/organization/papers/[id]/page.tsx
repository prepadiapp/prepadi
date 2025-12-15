import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { OrgPaperManagerClient } from './client'; 
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrgPaperManagePage({ params }: PageProps) {
  const session = await getAuthSession();
  
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      redirect('/login');
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;

  let orgId = (session.user as any).organizationId;
  if (!orgId) {
      const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
      orgId = dbUser?.organizationId;
  }
  if (!orgId) {
      const ownerOrg = await prisma.organization.findUnique({ where: { ownerId: session.user.id }, select: { id: true } });
      orgId = ownerOrg?.id;
  }

  if (!orgId) redirect('/dashboard');

  const paper = await prisma.examPaper.findUnique({
    where: { id, organizationId: orgId },
    include: {
      exam: true,
      subject: true,
      questions: {
        include: { 
            options: true,
            section: true // ADDED: Fetch section relation
        },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!paper) notFound();

  return <OrgPaperManagerClient paper={paper} />;
}
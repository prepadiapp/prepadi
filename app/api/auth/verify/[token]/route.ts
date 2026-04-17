import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface VerifyRouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: VerifyRouteContext) {
  const { token } = await params;
  const origin = new URL(request.url).origin;

  const verifyPageUrl = (status: string) => {
    const url = new URL('/verify-email', origin);
    url.searchParams.set('status', status);
    return url;
  };

  if (!token) {
    return NextResponse.redirect(verifyPageUrl('missing'));
  }

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.redirect(verifyPageUrl('invalid'));
    }

    const hasExpired = new Date(verificationToken.expires) < new Date();
    if (hasExpired) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
      return NextResponse.redirect(verifyPageUrl('expired'));
    }

    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.redirect(verifyPageUrl('invalid'));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
      },
    });

    await prisma.verificationToken.delete({
      where: { token },
    });

    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('verified', 'true');
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('[VERIFY_EMAIL_ROUTE_ERROR]', error);
    return NextResponse.redirect(verifyPageUrl('error'));
  }
}

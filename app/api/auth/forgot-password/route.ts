import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new NextResponse('Email is required', { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not for security
    if (!user || !user.hashedPassword) {
      // If user doesn't exist OR user signed up with Google (no password),
      // we just return OK to prevent email enumeration.
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    // Save token to DB
    // We can reuse VerificationToken model or create a new PasswordResetToken model
    // For simplicity, we'll reuse VerificationToken but ideally use a separate model or field
    // Let's check if a token already exists for this identifier
    
    // Clean up old tokens
    await prisma.verificationToken.deleteMany({
        where: { identifier: email }
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });

  } catch (error) {
    console.error('[FORGOT_PASSWORD_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
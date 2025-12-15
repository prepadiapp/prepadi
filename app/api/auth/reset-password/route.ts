import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return new NextResponse('Token and password are required', { status: 400 });
    }

    // 1. Verify Token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return new NextResponse('Invalid or expired token', { status: 400 });
    }

    if (new Date() > verificationToken.expires) {
      // Clean up expired token
      await prisma.verificationToken.delete({ where: { token } });
      return new NextResponse('Token has expired', { status: 400 });
    }

    // 2. Hash New Password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Update User
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { hashedPassword },
    });

    // 4. Delete Token (Consume it)
    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('[RESET_PASSWORD_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
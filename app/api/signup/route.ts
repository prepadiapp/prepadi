import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/lib/mail';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // --- 1. Validation ---
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // --- 2. Check if user already exists ---
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // --- 3. Hash the password ---
    const hashedPassword = await bcrypt.hash(password, 12);

    // --- 4. Create the User (as unverified) ---
    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
        // emailVerified will remain null for now
      },
    });

    // --- 5. Create a Verification Token ---
    const token = randomUUID(); // Generate a secure token
    const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour from now

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // --- 6. Send the Verification Email ---
    await sendVerificationEmail(email, token);

    // --- 7. Respond to Client ---
    // The client will redirect to /verify-email
    return NextResponse.json({ success: 'User created. Please verify your email.' }, { status: 201 });

  } catch (error) {
    console.error('SIGNUP_ERROR', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
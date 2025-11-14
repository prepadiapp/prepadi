import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * This API route handles the email verification link.
 * When a user clicks the link in their email, they are sent here.
 */
export async function GET(
  request: Request,
  context: any
//   { params }: { params: { token: string } }
) {
  console.log('Full context:', context);
  console.log('Params:', context.params);
  
  const { token } = await context.params;
  console.log('Token after await:', token);

  if (!token) {
    
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    // 1. Find the token in the database
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // 2. Check if the token has expired
    const hasExpired = new Date(verificationToken.expires) < new Date();
    if (hasExpired) {
      // Optional: Delete the expired token
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: 'Token has expired' }, { status: 410 });
    }

    // 3. Find the user associated with the token
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 4. Update the user to mark their email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
      },
    });

    // 5. Delete the token now that it has been used
    await prisma.verificationToken.delete({
      where: { token },
    });

    // 6. Redirect the user to the login page with a success message
    const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_APP_URL);
    loginUrl.searchParams.set('verified', 'true'); // Add a query param
    
    return NextResponse.redirect(loginUrl);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
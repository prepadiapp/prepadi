import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId, role, orgName, inviteToken, skipPlan } = body;

    const response = NextResponse.json({ success: true });

    // Save intent to a cookie
    response.cookies.set('prepadi_signup_intent', JSON.stringify({ 
      planId, 
      role, 
      orgName, 
      inviteToken,
      skipPlan // Added
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save intent' }, { status: 500 });
  }
}
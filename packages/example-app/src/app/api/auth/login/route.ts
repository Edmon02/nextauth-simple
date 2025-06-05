import { NextRequest, NextResponse } from 'next/server';
import { createSession, loginUser } from 'nextauth-simple';
import { config } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await loginUser({ email, password }, config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Login failed' },
        { status: 401 }
      );
    }

    // Check if 2FA is required
    if (result.twoFactorRequired) {
      return NextResponse.json({
        success: true,
        twoFactorRequired: true,
        userId: result.userId
      });
    }

    // Set session cookie

    const response = NextResponse.json({ success: true });
    createSession(result.userId as string, config, request, response);
    return response

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

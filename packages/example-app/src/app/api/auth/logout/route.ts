import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from 'nextauth-simple';
import { config } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Attempt logout
    const result = await logoutUser(config);
    
    if (result.success) {
      // Redirect to login page after logout
      return NextResponse.redirect(new URL('/login', request.url));
    } else {
      return NextResponse.json(
        { error: 'Logout failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

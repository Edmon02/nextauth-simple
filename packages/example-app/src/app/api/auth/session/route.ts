import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'nextauth-simple';
import { config } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(config);
    
    if (session) {
      return NextResponse.json({ 
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }, 
        user: session.user 
      });
    } else {
      return NextResponse.json({ session: null, user: null });
    }
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

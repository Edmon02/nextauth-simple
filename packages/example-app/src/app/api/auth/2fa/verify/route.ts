// src/app/api/auth/2fa/verify/route.ts
import { config } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyTwoFactorCode } from 'nextauth-simple';

export async function POST(request: NextRequest) {
    const { userId, code } = await request.json();

    const result = await verifyTwoFactorCode({ userId, code }, config);

    if (!result.success || !result.verified) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Set session cookie
    const response = NextResponse.json({ success: true });
    createSession(result.userId as string, config, request, response);

    return response;
}
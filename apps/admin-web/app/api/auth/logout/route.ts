import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, sessionCookie } from '@/lib/server';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookie, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

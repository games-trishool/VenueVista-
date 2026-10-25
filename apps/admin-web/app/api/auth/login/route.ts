import { NextRequest, NextResponse } from 'next/server';
import { backend, developmentAuth, sameOrigin, sessionCookie, unavailable } from '@/lib/server';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 });
  try {
    const input = await request.json();
    if (input.development && !developmentAuth())
      return NextResponse.json({ message: 'Development sign-in is disabled.' }, { status: 403 });
    if (!input.development && (typeof input.idToken !== 'string' || input.idToken.length > 16000))
      return NextResponse.json(
        { message: 'A Firebase identity token is required.' },
        { status: 400 },
      );
    const response = await backend(
      input.development ? 'auth/dev-session' : 'auth/firebase',
      undefined,
      {
        method: 'POST',
        body: JSON.stringify(input.development ? { persona: 'admin' } : { idToken: input.idToken }),
      },
    );
    const data = await response.json();
    if (!response.ok)
      return NextResponse.json(
        { message: data.error?.message ?? data.message ?? 'Sign-in failed.' },
        { status: response.status },
      );
    if (!data.accessToken || data.user?.role !== 'ADMIN')
      return NextResponse.json(
        { message: 'This account does not have administrator access.' },
        { status: 403 },
      );
    const result = NextResponse.json({
      user: { displayName: data.user.displayName, role: data.user.role },
    });
    result.cookies.set(sessionCookie, data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    });
    return result;
  } catch {
    return unavailable();
  }
}

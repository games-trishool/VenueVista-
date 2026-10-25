import { NextRequest, NextResponse } from 'next/server';
import { backend, getSession, sameOrigin, unavailable } from '@/lib/server';

const allowedPath =
  /^admin\/(overview|venues(?:\/[a-f0-9-]+(?:\/(?:review|suspend|feature))?)?|organizations(?:\/[a-f0-9-]+\/review)?|users|audit)$/;
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = await getSession();
  if (!token)
    return NextResponse.json(
      { message: 'Your administrator session has expired.' },
      { status: 401 },
    );
  if (request.method !== 'GET' && !sameOrigin(request))
    return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 });
  const { path } = await context.params;
  const target = path.join('/');
  if (!allowedPath.test(target))
    return NextResponse.json({ message: 'Unknown administrative endpoint.' }, { status: 404 });
  try {
    const body = request.method === 'GET' ? undefined : await request.text();
    if (body && body.length > 32000)
      return NextResponse.json({ message: 'Request too large.' }, { status: 413 });
    const response = await backend(`${target}${request.nextUrl.search}`, token, {
      method: request.method,
      body,
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return unavailable();
  }
}
export const GET = proxy;
export const POST = proxy;

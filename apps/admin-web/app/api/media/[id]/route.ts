import { NextRequest, NextResponse } from 'next/server';
import { backend, getSession, unavailable } from '@/lib/server';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getSession();
  if (!token) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  const { id } = await context.params;
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id))
    return NextResponse.json({ message: 'Invalid media identifier.' }, { status: 400 });
  try {
    const response = await backend(`media/${id}`, token);
    if (!response.ok)
      return NextResponse.json(
        { message: 'This photograph could not be loaded.' },
        { status: response.status },
      );
    const contentType = response.headers.get('content-type')?.split(';')[0] || '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType))
      return NextResponse.json({ message: 'Unsupported media type.' }, { status: 415 });
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return unavailable();
  }
}

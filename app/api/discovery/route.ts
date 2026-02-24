import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session-user';
import { activeMatchCount } from '@/lib/match';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (await activeMatchCount(userId) >= 5) {
    return NextResponse.json({ error: 'Locked', status: 'LOCKED' }, { status: 403 });
  }

  return NextResponse.json({ status: 'OK' });
}

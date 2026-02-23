import { NextResponse } from 'next/server';
import { runExpireLikes } from '@/scripts/expire-likes';

export async function POST() {
  const result = await runExpireLikes();
  return NextResponse.json({ ok: true, expired: result.count });
}

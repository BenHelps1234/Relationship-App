import { NextResponse } from 'next/server';
import { runDailyReset } from '@/scripts/daily-reset';

export async function POST() {
  await runDailyReset();
  return NextResponse.json({ ok: true });
}

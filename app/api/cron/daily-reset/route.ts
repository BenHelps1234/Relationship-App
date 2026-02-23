import { execSync } from 'node:child_process';
import { NextResponse } from 'next/server';

export async function POST() {
  execSync('npm run cron:daily', { stdio: 'inherit' });
  return NextResponse.json({ ok: true });
}

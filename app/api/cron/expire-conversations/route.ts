import { NextResponse } from 'next/server';
import { runExpireConversations } from '@/lib/conversation-expiry';

export async function POST() {
  const result = await runExpireConversations();
  return NextResponse.json({ ok: true, expired: result.count });
}

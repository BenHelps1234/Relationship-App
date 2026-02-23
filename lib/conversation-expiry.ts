import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

const INACTIVITY_MS = 72 * 3600 * 1000;

export type DbLike = PrismaClient | Prisma.TransactionClient;

export function isConversationStale(referenceTime: Date, now = new Date()): boolean {
  return now.getTime() - referenceTime.getTime() >= INACTIVITY_MS;
}

export async function runExpireConversations(db: DbLike = prisma) {
  const now = new Date();
  const candidates = await db.conversation.findMany({
    where: { state: { in: ['active', 'gated_to_video'] }, endedAt: null },
    select: { id: true, createdAt: true, lastMessageAt: true }
  });

  const staleIds = candidates
    .filter((c) => isConversationStale(c.lastMessageAt ?? c.createdAt, now))
    .map((c) => c.id);

  if (staleIds.length === 0) return { count: 0 };

  const result = await db.conversation.updateMany({
    where: { id: { in: staleIds }, state: { in: ['active', 'gated_to_video'] }, endedAt: null },
    data: { state: 'ended', endedAt: now, videoDateStatus: 'expired' }
  });

  return { count: result.count };
}

import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { isConversationInactive } from './domain';

export type DbLike = PrismaClient | Prisma.TransactionClient;

export async function runExpireConversations(db: DbLike = prisma) {
  const now = new Date();
  const candidates = await db.conversation.findMany({
    where: { state: { in: ['active', 'gated_to_video'] }, endedAt: null },
    select: { id: true, createdAt: true, lastMessageAt: true }
  });

  const staleIds = candidates
    .filter((c) => isConversationInactive(c.lastMessageAt ?? c.createdAt, now))
    .map((c) => c.id);

  if (staleIds.length === 0) return { count: 0 };

  const result = await db.conversation.updateMany({
    where: { id: { in: staleIds }, state: { in: ['active', 'gated_to_video'] }, endedAt: null },
    data: { state: 'ended', endedAt: now, videoDateStatus: 'expired' }
  });

  return { count: result.count };
}

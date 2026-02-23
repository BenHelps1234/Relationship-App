import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

export type DbLike = PrismaClient | Prisma.TransactionClient;

export function activeConversationWhere(userId: string): Prisma.ConversationWhereInput {
  return {
    state: { in: ['active', 'gated_to_video'] },
    endedAt: null,
    OR: [{ participantAId: userId }, { participantBId: userId }]
  };
}

export async function activeMatchCount(userId: string, db: DbLike = prisma): Promise<number> {
  return db.conversation.count({ where: activeConversationWhere(userId) });
}

export async function isAtActiveMatchCap(userId: string, cap = 5, db: DbLike = prisma): Promise<boolean> {
  const count = await activeMatchCount(userId, db);
  return count >= cap;
}

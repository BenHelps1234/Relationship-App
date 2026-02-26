import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { pairKey } from './pairs';

type DbLike = PrismaClient | Prisma.TransactionClient;

export const UNFREEZE_RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function dissolveFrozenPair(userAId: string, userBId: string, db: DbLike = prisma) {
  const key = pairKey(userAId, userBId);

  await db.user.updateMany({
    where: { id: userAId, partnerId: userBId, isFrozen: true },
    data: { isFrozen: false, partnerId: null }
  });
  await db.user.updateMany({
    where: { id: userBId, partnerId: userAId, isFrozen: true },
    data: { isFrozen: false, partnerId: null }
  });

  await db.conversation.deleteMany({
    where: { pairKey: key }
  });

  await db.like.deleteMany({
    where: {
      OR: [
        { fromUserId: userAId, toUserId: userBId },
        { fromUserId: userBId, toUserId: userAId }
      ]
    }
  });
}

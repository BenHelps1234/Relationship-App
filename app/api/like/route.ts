import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { getSessionUserId } from '@/lib/session-user';
import { incrementDailyLikesReceived } from '@/lib/daily-stats';

async function activeConversationCount(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  return tx.conversation.count({
    where: {
      state: { in: ['active', 'gated_to_video'] },
      OR: [{ participantAId: userId }, { participantBId: userId }]
    }
  });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { dailyQuota: true } });
  if (!user) return new Response('No user', { status: 400 });
  if (user.isFrozen) return new Response('Frozen accounts cannot like.', { status: 403 });

  const form = await req.formData();
  const toUserId = String(form.get('toUserId'));
  if (!toUserId || toUserId === user.id) return new Response('Invalid target user', { status: 400 });

  if (!user.dailyQuota || user.dailyQuota.likesRemaining <= 0) {
    return new Response('Daily like limit reached.', { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingPending = await tx.like.findFirst({
        where: { fromUserId: user.id, toUserId, status: 'pending' }
      });
      if (existingPending) {
        throw new Error('duplicate_pending_like');
      }

      await tx.like.create({
        data: {
          fromUserId: user.id,
          toUserId,
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          status: 'pending'
        }
      });

      await incrementDailyLikesReceived(toUserId, tx);

      await tx.dailyQuota.update({ where: { userId: user.id }, data: { likesRemaining: { decrement: 1 } } });

      const reciprocal = await tx.like.findFirst({ where: { fromUserId: toUserId, toUserId: user.id, status: 'pending' } });
      if (reciprocal) {
        const requesterActiveCount = await activeConversationCount(tx, user.id);
        const targetActiveCount = await activeConversationCount(tx, toUserId);
        const existingConversation = await tx.conversation.findFirst({
          where: {
            state: { in: ['active', 'gated_to_video'] },
            OR: [
              { participantAId: user.id, participantBId: toUserId },
              { participantAId: toUserId, participantBId: user.id }
            ]
          }
        });

        if (!existingConversation && requesterActiveCount < ACTIVE_CONVERSATION_LIMIT && targetActiveCount < ACTIVE_CONVERSATION_LIMIT) {
          await tx.like.updateMany({
            where: {
              OR: [
                { fromUserId: user.id, toUserId },
                { fromUserId: toUserId, toUserId: user.id }
              ]
            },
            data: { status: 'matched' }
          });
          await tx.conversation.create({ data: { participantAId: user.id, participantBId: toUserId, state: 'active' } });
        }
      }

      await tx.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'duplicate_pending_like') {
      return new Response('You already liked this profile. Await response or expiry.', { status: 400 });
    }
    throw error;
  }

  redirect('/discovery');
}

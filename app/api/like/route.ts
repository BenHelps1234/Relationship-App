import { redirect } from 'next/navigation';
import { LikeType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { getSessionUserId } from '@/lib/session-user';
import { incrementDailyLikesReceived } from '@/lib/daily-stats';
import { pairKey } from '@/lib/pairs';
import { ensureDailyQuotaFresh } from '@/lib/quota';

const LIKE_EXPIRY_MS = 48 * 3600 * 1000;

function parseLikeType(raw: FormDataEntryValue | null): LikeType {
  const value = String(raw || 'direct');
  if (value === 'invisible') return LikeType.invisible;
  if (value === 'strong') return LikeType.strong;
  return LikeType.direct;
}

function likeTypeRank(type: LikeType): number {
  if (type === LikeType.strong) return 3;
  if (type === LikeType.direct) return 2;
  return 1;
}

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

  await ensureDailyQuotaFresh(userId);

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { dailyQuota: true } });
  if (!user) return new Response('No user', { status: 400 });
  if (user.accountStatus !== 'active') {
    console.warn(`[like] blocked banned/inactive user=${user.id}`);
    return new Response('Account not allowed.', { status: 403 });
  }
  if (user.isFrozen) {
    console.warn(`[like] blocked frozen user=${user.id}`);
    return new Response('Frozen accounts cannot like.', { status: 403 });
  }

  const form = await req.formData();
  const toUserId = String(form.get('toUserId') || '');
  const requestedType = parseLikeType(form.get('type'));
  if (!toUserId || toUserId === user.id) return new Response('Invalid target user', { status: 400 });

  if (!user.dailyQuota || user.dailyQuota.likesRemaining <= 0) {
    console.info(`[like] daily quota block user=${user.id}`);
    return new Response('Daily like limit reached.', { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LIKE_EXPIRY_MS);

  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: toUserId } });
    if (!target || target.accountStatus !== 'active' || target.isFrozen) {
      return { kind: 'invalid-target' as const };
    }

    const existing = await tx.like.findUnique({
      where: { fromUserId_toUserId: { fromUserId: user.id, toUserId } }
    });

    let consumedLike = false;
    if (!existing) {
      await tx.like.create({
        data: { fromUserId: user.id, toUserId, type: requestedType, status: 'pending', expiresAt }
      });
      consumedLike = true;
    } else {
      const isExpiredPending = existing.status === 'pending' && now >= existing.expiresAt;
      if (isExpiredPending) {
        await tx.like.update({ where: { id: existing.id }, data: { status: 'expired' } });
      }

      if (existing.status === 'pending' && now < existing.expiresAt) {
        if (likeTypeRank(requestedType) > likeTypeRank(existing.type)) {
          await tx.like.update({ where: { id: existing.id }, data: { type: requestedType, expiresAt } });
          return { kind: 'upgraded' as const };
        }
        return { kind: 'already-liked' as const };
      }

      await tx.like.update({
        where: { id: existing.id },
        data: { status: 'pending', type: requestedType, expiresAt }
      });
      consumedLike = true;
    }

    if (consumedLike) {
      await tx.dailyQuota.update({ where: { userId: user.id }, data: { likesRemaining: { decrement: 1 } } });
      await incrementDailyLikesReceived(toUserId, tx);
    }

    const reciprocal = await tx.like.findUnique({
      where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: user.id } }
    });

    if (reciprocal && reciprocal.status === 'pending' && reciprocal.expiresAt > now) {
      const requesterActiveCount = await activeConversationCount(tx, user.id);
      const targetActiveCount = await activeConversationCount(tx, toUserId);
      if (requesterActiveCount < ACTIVE_CONVERSATION_LIMIT && targetActiveCount < ACTIVE_CONVERSATION_LIMIT) {
        await tx.like.updateMany({
          where: {
            OR: [
              { fromUserId: user.id, toUserId },
              { fromUserId: toUserId, toUserId: user.id }
            ]
          },
          data: { status: 'matched' }
        });

        const conversationPairKey = pairKey(user.id, toUserId);
        const existingConversation = await tx.conversation.findUnique({ where: { pairKey: conversationPairKey } });
        if (!existingConversation) {
          await tx.conversation.create({
            data: { pairKey: conversationPairKey, participantAId: user.id, participantBId: toUserId, state: 'active' }
          });
          console.info(`[like] match created pair=${conversationPairKey}`);
        }
      } else {
        console.info(`[like] match blocked by conversation cap requester=${user.id} target=${toUserId}`);
      }
    }

    await tx.user.update({ where: { id: user.id }, data: { lastActiveAt: now } });
    return { kind: 'ok' as const };
  });

  if (result.kind === 'invalid-target') return new Response('Target unavailable.', { status: 400 });
  if (result.kind === 'already-liked') return new Response('You already liked this profile.', { status: 400 });

  redirect('/discovery');
}

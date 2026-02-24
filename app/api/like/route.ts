import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ACTIVE_CONVERSATION_LIMIT } from '@/lib/domain';
import { getSessionUserId } from '@/lib/session-user';
import { incrementDailyLikesReceived } from '@/lib/daily-stats';
import { pairKey } from '@/lib/pairs';
import { ensureDailyQuotaFresh } from '@/lib/quota';
import { activeMatchCount } from '@/lib/match';

const LIKE_EXPIRY_MS = 48 * 3600 * 1000;
type LikeTypeValue = 'direct' | 'invisible' | 'strong';

function parseLikeType(raw: FormDataEntryValue | null): LikeTypeValue {
  const value = String(raw || 'direct');
  if (value === 'invisible') return 'invisible';
  if (value === 'strong') return 'strong';
  return 'direct';
}

function likeTypeRank(type: LikeTypeValue): number {
  if (type === 'strong') return 3;
  if (type === 'direct') return 2;
  return 1;
}

function likeWeight(type: LikeTypeValue): number {
  return type === 'strong' ? 1.5 : 1.0;
}

function likeCountWeight(type: LikeTypeValue): number {
  return type === 'strong' ? 2 : 1;
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
  if (await activeMatchCount(user.id) >= ACTIVE_CONVERSATION_LIMIT) {
    return new Response('You already have 5 active matches. Resolve one before liking.', { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LIKE_EXPIRY_MS);

  const result = await prisma.$transaction(async (tx) => {
    const requesterActiveCountPre = await activeMatchCount(user.id, tx);
    if (requesterActiveCountPre >= ACTIVE_CONVERSATION_LIMIT) {
      return { kind: 'requester-at-cap' as const };
    }

    const target = await tx.user.findUnique({ where: { id: toUserId } });
    if (!target || target.accountStatus !== 'active' || target.isFrozen) {
      return { kind: 'invalid-target' as const };
    }
    const targetActiveCountPre = await activeMatchCount(toUserId, tx);
    if (targetActiveCountPre >= ACTIVE_CONVERSATION_LIMIT) {
      return { kind: 'target-at-cap' as const };
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
        if (likeTypeRank(requestedType) > likeTypeRank(existing.type as LikeTypeValue)) {
          const delta = likeWeight(requestedType) - likeWeight(existing.type as LikeTypeValue);
          await tx.like.update({ where: { id: existing.id }, data: { type: requestedType, expiresAt } });
          if (delta > 0) {
            await tx.user.update({
              where: { id: toUserId },
              data: {
                likesReceivedCount: { increment: delta },
                likes_received_count: { increment: likeCountWeight(requestedType) - likeCountWeight(existing.type as LikeTypeValue) }
              }
            });
          }
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
      await tx.user.update({
        where: { id: toUserId },
        data: {
          likesReceivedCount: { increment: likeWeight(requestedType) },
          likesCount: { increment: 1 },
          likes_received_count: { increment: likeCountWeight(requestedType) }
        }
      });
    }

    const reciprocal = await tx.like.findUnique({
      where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: user.id } }
    });

    if (reciprocal && reciprocal.status === 'pending' && reciprocal.expiresAt > now) {
      const requesterActiveCount = await activeMatchCount(user.id, tx);
      const targetActiveCount = await activeMatchCount(toUserId, tx);
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
  if (result.kind === 'requester-at-cap') return new Response('You already have 5 active matches. Resolve one before liking.', { status: 400 });
  if (result.kind === 'target-at-cap') return new Response('Target already has 5 active matches.', { status: 400 });
  if (result.kind === 'already-liked') return new Response('You already liked this profile.', { status: 400 });

  redirect('/discovery');
}

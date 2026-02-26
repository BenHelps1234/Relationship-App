import { prisma } from '@/lib/prisma';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type LikeActionType = 'direct' | 'invisible' | 'strong';

function congestionPenalty(queueCount: number): number {
  if (queueCount > 150) return 40;
  if (queueCount >= 51) return 25;
  if (queueCount >= 20) return 10;
  return 0;
}

function signalBonus(actionType: LikeActionType): number {
  if (actionType === 'strong') return 20;
  return 0;
}

export async function getMatchProbability(viewerId: string, targetId: string, actionType: LikeActionType = 'direct'): Promise<number> {
  const [viewer, target, queueCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewerId }, select: { mps: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { mps: true } }),
    prisma.like.count({
      where: { toUserId: targetId, type: 'strong', status: 'pending', expiresAt: { gt: new Date() } }
    })
  ]);

  if (!viewer || !target) return 0;

  let probability = 100;
  const gap = target.mps - viewer.mps;
  if (gap > 2.5) {
    probability -= gap * 15;
  }

  const penalty = congestionPenalty(queueCount);
  probability -= penalty;
  probability += signalBonus(actionType);
  return Math.round(clamp(probability, 1, 100));
}

export function marketRealityWarning(senderMps: number, targetMps: number, pendingStrongLikes: number): string | null {
  if (targetMps - senderMps > 2.5 || pendingStrongLikes > 50) {
    return 'Based on current demand and your Market Placement, you may be positioned lower in this queue. Consider optimizing your profile or targeting closer market peers for faster results.';
  }
  return null;
}

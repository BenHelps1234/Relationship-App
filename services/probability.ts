import { prisma } from '@/lib/prisma';
import { intentScore } from './scoring';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function congestionPenalty(queueCount: number): number {
  if (queueCount > 50) return 40;
  if (queueCount > 20) return 25;
  if (queueCount > 10) return 10;
  return 0;
}

export async function getMatchProbability(viewerId: string, targetId: string): Promise<number> {
  const [viewer, target, queueCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewerId }, select: { mps: true } }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: { mps: true, likesCount: true, impressionsCount: true }
    }),
    prisma.like.count({
      where: { toUserId: targetId, status: 'pending', expiresAt: { gt: new Date() } }
    })
  ]);

  if (!viewer || !target) return 0;

  let probability = 100;
  const gap = Math.abs(target.mps - viewer.mps);
  if (gap > 2.5) {
    probability -= gap * 15;
  }

  const penalty = congestionPenalty(queueCount);
  probability -= penalty;

  const intent = intentScore(target.likesCount, target.impressionsCount);
  probability += intent * 5;

  return Math.round(clamp(probability, 1, 99));
}

export function marketRealityWarning(senderMps: number, targetMps: number, queueCount: number): string | null {
  if (targetMps - senderMps > 2.5 || queueCount > 50) {
    return 'Based on current demand and your Market Placement, you may be positioned lower in this queue. To move up, complete Roadmap Tasks to optimize resonance or maintain high Reliability.';
  }
  return null;
}

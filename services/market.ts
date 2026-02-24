import { prisma } from '@/lib/prisma';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function likeImpressionRatio(likesReceived: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return likesReceived / impressions;
}

export function reliabilityFromImpressions(impressions: number): number {
  return clamp(impressions / 50, 0, 1);
}

export async function calculateCityMps(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, cityId: true, impressions_count: true, likes_received_count: true }
  });
  if (!user) return null;

  const cityUsers = await prisma.user.findMany({
    where: { cityId: user.cityId, accountStatus: 'active', isFrozen: false },
    select: { impressions_count: true, likes_received_count: true }
  });
  const ratios = cityUsers.map((u) => likeImpressionRatio(u.likes_received_count, u.impressions_count)).sort((a, b) => a - b);
  if (ratios.length === 0) return 5;

  const myRatio = likeImpressionRatio(user.likes_received_count, user.impressions_count);
  let lessOrEqual = 0;
  for (const r of ratios) if (r <= myRatio) lessOrEqual += 1;
  const percentile = lessOrEqual / ratios.length;

  return Number((2 + percentile * 6).toFixed(2));
}

export async function refreshMarketScores() {
  const users = await prisma.user.findMany({ select: { id: true, impressions_count: true } });
  for (const user of users) {
    const mps = await calculateCityMps(user.id);
    if (mps == null) continue;
    const reliability = reliabilityFromImpressions(user.impressions_count);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mps,
        mpsCurrent: mps,
        reliability,
        reliabilityScore: reliability
      }
    });
  }
}

export function displayMpsOrCalibrating(mps: number, impressions: number): string {
  return impressions < 20 ? 'Calibrating' : mps.toFixed(2);
}

export async function matchProbability(senderId: string, targetId: string): Promise<number> {
  const [sender, target, queue] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { mps: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { mps: true } }),
    prisma.like.count({ where: { toUserId: targetId, status: 'pending', expiresAt: { gt: new Date() } } })
  ]);
  if (!sender || !target) return 0;
  let probability = 100 - (target.mps - sender.mps) * 15;
  if (queue > 50) probability *= 0.8;
  return Math.round(clamp(probability, 1, 99));
}

import { prisma } from '@/lib/prisma';

type MarketScoreResult =
  | { status: 'calibrating'; reliability: number; ratio: number; impressionsCount: number }
  | { status: 'ready'; mps: number; reliability: number; ratio: number; impressionsCount: number; percentileRank: number };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function likeImpressionRatio(likesReceived: number, impressionsCount: number): number {
  if (impressionsCount <= 0) return 0;
  return likesReceived / impressionsCount;
}

export function reliabilityFromImpressions(impressionsCount: number): number {
  return Number(clamp(impressionsCount / 100, 0, 1).toFixed(4));
}

function mpsFromPercentile(percentileRank: number): number {
  if (percentileRank <= 0.1) return 2.0;
  if (percentileRank >= 0.9) return 8.0;
  const normalized = (percentileRank - 0.1) / 0.8;
  return Number((2.1 + normalized * (7.9 - 2.1)).toFixed(2));
}

export async function calculateMarketScore(userId: string): Promise<MarketScoreResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      cityId: true,
      impressionsCount: true,
      likesReceivedCount: true
    }
  });
  if (!user) return null;

  const reliability = reliabilityFromImpressions(user.impressionsCount);
  const ratio = likeImpressionRatio(user.likesReceivedCount, user.impressionsCount);
  if (user.impressionsCount < 20) {
    return { status: 'calibrating', reliability, ratio, impressionsCount: user.impressionsCount };
  }

  const cityUsers = await prisma.user.findMany({
    where: { cityId: user.cityId, accountStatus: 'active', isFrozen: false },
    select: { impressionsCount: true, likesReceivedCount: true }
  });
  if (cityUsers.length === 0) {
    return { status: 'ready', mps: 5, reliability, ratio, impressionsCount: user.impressionsCount, percentileRank: 0.5 };
  }

  const cityRatios = cityUsers.map((u) => likeImpressionRatio(u.likesReceivedCount, u.impressionsCount));
  const less = cityRatios.filter((r) => r < ratio).length;
  const equal = cityRatios.filter((r) => r === ratio).length;
  const percentileRank = clamp((less + equal * 0.5) / cityRatios.length, 0, 1);
  const mps = mpsFromPercentile(percentileRank);

  return { status: 'ready', mps, reliability, ratio, impressionsCount: user.impressionsCount, percentileRank };
}

export async function refreshMarketScores(): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    const result = await calculateMarketScore(user.id);
    if (!result) continue;

    if (result.status === 'calibrating') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          reliability: result.reliability,
          reliabilityScore: result.reliability
        }
      });
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        mps: result.mps,
        mpsCurrent: result.mps,
        reliability: result.reliability,
        reliabilityScore: result.reliability
      }
    });
  }
}

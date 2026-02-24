import { prisma } from '@/lib/prisma';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function reliabilityFromImpressions(impressions: number): number {
  return clamp(0.05 + Math.floor(Math.max(0, impressions) / 10) * 0.05, 0.05, 1.0);
}

function marketResonance(weightedLikes: number, impressions: number): number {
  const ratio = weightedLikes / Math.max(1, impressions);
  const logValue = Math.log10(ratio * 100 + 1);
  const normalized = clamp(logValue / 2, 0, 1);
  return Number((2 + normalized * 6).toFixed(2));
}

export async function calculateMPS(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const reliability = reliabilityFromImpressions(user.impressionsCount);
  const mr = marketResonance(user.likesReceivedCount, user.impressionsCount);
  const base = clamp(user.basePotential, 2, 8);
  let blended = base * (1 - reliability) + mr * reliability;
  if (user.impressionsCount < 10) {
    blended = clamp(blended, base - 0.5, base + 0.5);
  }
  blended = clamp(blended, 2, 8);

  return {
    mps: Number(blended.toFixed(2)),
    reliability: Number(reliability.toFixed(2)),
    marketResonance: mr
  };
}

export function intentScore(weightedLikes: number, impressions: number): number {
  const ratio = impressions > 0 ? weightedLikes / impressions : 0;
  return clamp(Number(ratio.toFixed(4)), 0, 1);
}

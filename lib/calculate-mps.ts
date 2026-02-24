export type InteractionHistory = {
  impressionsCount: number;
  likesReceivedCount: number;
  basePotentialScore: number;
  reliabilityScore?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function deriveReliability(impressionsCount: number): number {
  return clamp(Math.max(0.05, impressionsCount / 200), 0.05, 1.0);
}

export function marketResonance(impressionsCount: number, weightedLikes: number): number {
  const ratioPercent = (weightedLikes / (impressionsCount + 1)) * 100;
  const raw = Math.log10(Math.max(1, ratioPercent + 1));
  return clamp(2 + raw * 3, 2, 8);
}

export function calculateMPS(input: InteractionHistory): { mps: number; reliability: number; mr: number } {
  const impressions = Math.max(0, Math.trunc(input.impressionsCount));
  const weightedLikes = Math.max(0, input.likesReceivedCount);
  const base = clamp(input.basePotentialScore, 2, 8);
  const reliability = clamp(input.reliabilityScore ?? deriveReliability(impressions), 0.05, 1.0);
  const mr = marketResonance(impressions, weightedLikes);

  let mps = base * (1 - reliability) + mr * reliability;
  mps = clamp(mps, 2, 8);

  if (impressions < 10) {
    mps = clamp(mps, base - 0.5, base + 0.5);
  }

  return { mps: Number(mps.toFixed(2)), reliability: Number(reliability.toFixed(4)), mr: Number(mr.toFixed(2)) };
}
